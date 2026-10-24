"""Bounded, deterministic prompt-overlap checks; not a semantic safety verdict.

Only hashes and counts leave this module. No prompt or response snippets are
persisted as leakage evidence. JSON examples in this vision prompt are output
scaffolding, not protected instructions. Keys and values are scanned separately.
"""
from dataclasses import dataclass
from hashlib import sha256
import json
import re
import unicodedata


LEAKAGE_RULE_VERSION = "normalized-instruction-overlap-v2"
MIN_MATCH_TOKENS = 8
MIN_LINE_CHARS = 40
MAX_CHECK_CHARS = 64000
MAX_JSON_PROBES = 32
_WORDS = re.compile(r"[^\W_]+", re.UNICODE)
_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


@dataclass(frozen=True)
class LeakageCheck:
    status: str
    evidence: dict
    rule_version: str = LEAKAGE_RULE_VERSION


def _tokens(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    # Zero-width and other formatting controls can split an otherwise exact echo.
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Cf")
    return _WORDS.findall(normalized)


def _without_json_examples(prompt: str) -> str | None:
    """Remove complete JSON objects/arrays while retaining surrounding prose."""
    decoder = json.JSONDecoder()
    pieces = []
    position = 0
    probes = 0
    while position < len(prompt):
        start = re.search(r"[\[{]", prompt[position:])
        if start is None:
            pieces.append(prompt[position:])
            break
        index = position + start.start()
        probes += 1
        if probes > MAX_JSON_PROBES:
            return None
        pieces.append(prompt[position:index])
        try:
            _, length = decoder.raw_decode(prompt[index:])
        except (ValueError, RecursionError):
            pieces.append(prompt[index])
            position = index + 1
        else:
            pieces.append("\n")
            position = index + length
    return "".join(pieces)


def _response_strings(content: str) -> list[str]:
    """Match within individual keys/values, never across fields or list items."""
    fenced = _FENCE.fullmatch(content)
    text = fenced.group(1) if fenced else content
    try:
        value = json.loads(text)
    except (ValueError, RecursionError):
        return [content]
    strings = []
    pending = [value]
    while pending:
        current = pending.pop()
        if isinstance(current, str):
            strings.append(current)
        elif isinstance(current, dict):
            pending.extend(reversed(list(current.keys()) + list(current.values())))
        elif isinstance(current, list):
            pending.extend(reversed(current))
    return strings


def evaluate_prompt_leakage(content: str, prompt: str) -> LeakageCheck:
    evidence = {"rule": "normalized-instruction-overlap", "minimum_token_count": MIN_MATCH_TOKENS,
                "minimum_line_characters": MIN_LINE_CHARS}
    if not isinstance(content, str) or not isinstance(prompt, str):
        return LeakageCheck("NOT_CHECKED", {**evidence, "reason": "UNSUPPORTED_INPUT"})
    if len(content) > MAX_CHECK_CHARS or len(prompt) > MAX_CHECK_CHARS:
        return LeakageCheck("NOT_CHECKED", {**evidence, "reason": "INPUT_TOO_LARGE"})

    prose = _without_json_examples(prompt)
    if prose is None:
        return LeakageCheck("NOT_CHECKED", {**evidence, "reason": "PROMPT_TOO_COMPLEX"})
    protected = _tokens(prose)
    short_lines = [tokens for line in prose.splitlines()
                   if (tokens := _tokens(line)) and len(tokens) < MIN_MATCH_TOKENS
                   and len(" ".join(tokens)) >= MIN_LINE_CHARS]
    evidence["prompt_token_count"] = len(protected)
    if len(protected) < MIN_MATCH_TOKENS and not short_lines:
        return LeakageCheck("NOT_CHECKED", {**evidence, "reason": "INSUFFICIENT_INSTRUCTION_TEXT"})

    outputs = [_tokens(value) for value in _response_strings(content)]
    evidence["output_token_count"] = sum(map(len, outputs))
    evidence["output_text_hash"] = sha256(content.encode("utf-8")).hexdigest()
    # Preserve the old detector's coverage for a long complete instruction
    # with fewer than eight words, while excluding the expected JSON template.
    short_windows = {}
    for line in short_lines:
        short_windows.setdefault(len(line), set()).add(tuple(line))
    for size, candidates in short_windows.items():
        for tokens in outputs:
            for index in range(len(tokens) - size + 1):
                candidate = tuple(tokens[index:index + size])
                if candidate in candidates:
                    return LeakageCheck("DETECTED", {
                        **evidence, "match_type": "COMPLETE_INSTRUCTION_LINE",
                        "matched_token_count": size,
                        "matched_text_hash": sha256(" ".join(candidate).encode()).hexdigest(),
                    })
    windows = {}
    for index in range(len(protected) - MIN_MATCH_TOKENS + 1):
        windows.setdefault(tuple(protected[index:index + MIN_MATCH_TOKENS]), index)
    for tokens in outputs:
        for index in range(len(tokens) - MIN_MATCH_TOKENS + 1):
            start = windows.get(tuple(tokens[index:index + MIN_MATCH_TOKENS]))
            if start is None:
                continue
            length = MIN_MATCH_TOKENS
            while (start + length < len(protected) and index + length < len(tokens)
                   and protected[start + length] == tokens[index + length]):
                length += 1
            matched = " ".join(tokens[index:index + length])
            return LeakageCheck("DETECTED", {
                **evidence, "match_type": "TOKEN_SPAN", "matched_token_count": length,
                "matched_text_hash": sha256(matched.encode("utf-8")).hexdigest(),
            })
    return LeakageCheck("NOT_DETECTED", evidence)
