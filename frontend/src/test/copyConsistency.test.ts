import { describe, expect, it } from "vitest";

/**
 * Sprint 3 Week 3, "Microcopy & consistency pass": Emily is strict that role names are capitalised (Manager, Client,
 * Reviewer) and spelled one way on every screen. This scans the app's own source for the slips the pass found, so
 * they can't come back. It reads strings and screen text only, not comments, and only checks phrases that are wrong in
 * every context. The Reviewer/Auditor wording is a separate decision (see docs/ux/week3-microcopy-and-consistency-pass.md).
 */
const SOURCES = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

const FILES = Object.entries(SOURCES).filter(([path]) => !/\.test\.|\/test\//.test(path));

/** Lines that hold a URL, a route or an ID rather than words on a screen. */
const NOT_SCREEN_TEXT = /\/customers|report-customer|path=|\bto=|fetch\(|navigate\(/;

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /\b(your|the|a|ask|contact|tell) manager\b/, why: "Manager is always capitalised" },
  { pattern: /\b[Aa]ll clients\b/, why: 'the all-Clients view is "All Clients"' },
  { pattern: /\bCommunity Hub\b/, why: "the platform is spelled CommunityHub, one word" },
  { pattern: /\b[Cc]ustomers?\b/, why: "RCS calls the organisations it serves Clients, never customers" },
];

/** Screen text and strings only: drop whole-line comments and anything after a trailing // comment. */
function visibleText(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .map((line) => line.replace(/\s\/\/\s.*$/, ""));
}

describe("copy consistency", () => {
  it("reads the app's source (a guard, so the check can't pass by scanning nothing)", () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it.each(BANNED)("never uses a banned phrase: $why", ({ pattern }) => {
    const hits = FILES.flatMap(([path, source]) =>
      visibleText(source)
        .map((line, i) => ({ path, line, i }))
        // Keep only lines that put words on screen: quoted text or text between tags.
        .filter(({ line }) => pattern.test(line) && /["'`>]/.test(line) && !NOT_SCREEN_TEXT.test(line))
        .map(({ path: p, line, i }) => `${p.replace("/src/", "")}:${i + 1}  ${line.trim().slice(0, 90)}`),
    );
    expect(hits).toEqual([]);
  });

  it("capitalises every role name in a sentence: Manager, Reviewer, Client, Auditor", () => {
    // Quoted strings that read as a sentence (two or more words), not an ID, a route, a class name or a CSS value.
    const QUOTED = /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g;
    const LOWER_ROLE = /\b(managers?|reviewers?|auditors?|clients?)\b/;
    const LOOKS_LIKE_CODE = /[/_=#.{}<>:()[\]$@|\\-]|\b[a-z]+[A-Z]/;
    // Words written straight into the markup: on one line (`<p>text</p>`), or on a line of their own inside a tag.
    const JSX_TEXT = />([^<>{}\n]+)</g;
    const PROSE_LINE = /^\s*[A-Za-z][^<>{}=;:()[\]"`]*$/;
    const CODE_START = /^\s*(import|export|const|let|type|interface|return|case|default)\b/;
    const hits = FILES.flatMap(([path, source]) =>
      visibleText(source).flatMap((line, i) => {
        const found = [
          ...[...line.matchAll(QUOTED)].map((m) => m[1] ?? m[2] ?? m[3]),
          ...[...line.matchAll(JSX_TEXT)].map((m) => m[1]),
          ...(PROSE_LINE.test(line) && !CODE_START.test(line) ? [line.trim()] : []),
        ];
        return found
          .filter((text) => /\s/.test(text.trim()) && LOWER_ROLE.test(text) && !LOOKS_LIKE_CODE.test(text))
          .map((text) => `${path.replace("/src/", "")}:${i + 1}  "${text.slice(0, 80)}"`);
      }),
    );
    expect(hits).toEqual([]);
  });

  it("starts every seeded Client message and reply with a capital letter", () => {
    const seed = SOURCES["/src/services/mock/b2bSeed.ts"];
    const lowercaseStarts = [...seed.matchAll(/\b(?:body|subject):\s*"([a-z][^"]{0,40})/g)].map((m) => m[1]);
    expect(lowercaseStarts).toEqual([]);
  });

  it("formats a time of day only through the shared helpers, so AM and PM stay in capitals", () => {
    // The browser writes "12:33 am" for en-AU. formatClockTime and its siblings in utils/ correct that.
    const RAW_TIME = /toLocaleTimeString\(|toLocaleString\([^)]*hour:|hour: "numeric"/;
    const hits = FILES.filter(([path]) => !path.startsWith("/src/utils/")).flatMap(([path, source]) =>
      visibleText(source)
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => RAW_TIME.test(line))
        .map(({ line, i }) => `${path.replace("/src/", "")}:${i + 1}  ${line.trim().slice(0, 90)}`),
    );
    expect(hits).toEqual([]);
  });
});
