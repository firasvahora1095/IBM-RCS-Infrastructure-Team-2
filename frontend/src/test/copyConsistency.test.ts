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

  it("starts every seeded Client message and reply with a capital letter", () => {
    const seed = SOURCES["/src/services/mock/b2bSeed.ts"];
    const lowercaseStarts = [...seed.matchAll(/\b(?:body|subject):\s*"([a-z][^"]{0,40})/g)].map((m) => m[1]);
    expect(lowercaseStarts).toEqual([]);
  });
});
