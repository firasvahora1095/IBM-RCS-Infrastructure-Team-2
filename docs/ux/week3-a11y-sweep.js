// Sprint 3 Week 3 accessibility sweep (docs/ux/week3-final-visual-qa-and-accessibility.md).
//
// Runs axe-core over a list of screens in the page you already have open, then measures what axe cannot: contrast for
// text on gradients (worst case across every colour stop behind it) and whether every control shows a focus indicator.
//
// How to use it
//   1. Start the app (`npm run dev` in frontend/) and sign in as the person whose screens you are checking.
//   2. Paste this file into the DevTools console, then run: `await rcsA11ySweep(["/manager", "/manager/cases"])`.
//      It loads axe-core from the dev server, so it only works against `npm run dev`, not the deployed site.
//   3. For the keyboard check, press Tab once in the page first. The browser then treats focus as keyboard focus, and
//      `:focus-visible` styles apply, which is what a keyboard user sees.
//
// It moves between screens without reloading, so a screen that needs a click (a dialog, a tab) must be opened by hand
// and checked on its own by calling `rcsA11ySweep([location.pathname + location.search])`.

async function rcsA11ySweep(routes, { settleMs = 1600 } = {}) {
  if (!window.axe) (0, eval)(await (await fetch("/node_modules/axe-core/axe.min.js")).text());
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Contrast on gradients: the worst ratio of the text colour against every colour stop behind it. ---
  const parse = (s) => {
    const m = (s || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const stopsOf = (img) =>
    img && /gradient/.test(img) ? (img.match(/rgba?\([^)]*\)/g) || []).map(parse).filter(Boolean) : [];
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const luminance = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // Every colour the text could sit on, stacked in the order the browser paints them. A thin pseudo-element is a rule
  // or an underline, not something the text sits on, so it is skipped.
  const backdrops = (start) => {
    const layers = [];
    for (let el = start; el; el = el.parentElement) {
      for (const pseudo of ["::after", "::before"]) {
        const s = getComputedStyle(el, pseudo);
        if (s.content === "none" || parseFloat(s.height) <= 8 || parseFloat(s.width) <= 8) continue;
        const g = stopsOf(s.backgroundImage);
        if (g.length) layers.push({ g });
      }
      const s = getComputedStyle(el);
      const g = stopsOf(s.backgroundImage);
      if (g.length) layers.push({ g });
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        layers.push({ s: c });
        if (c.a >= 0.99) break;
      }
    }
    let candidates = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (const l of layers.reverse()) {
      candidates = l.s ? candidates.map((c) => over(l.s, c)) : candidates.flatMap((c) => l.g.map((stop) => over(stop, c)));
    }
    return candidates;
  };
  const gradientWorstCase = (nodes) => {
    let worst = null;
    for (const n of nodes) {
      const el = document.querySelector(n.target[0]);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const gradientText = /text/.test(cs.backgroundClip || cs.webkitBackgroundClip || "") && (parse(cs.webkitTextFillColor) || { a: 1 }).a === 0;
      const fgs = gradientText ? stopsOf(cs.backgroundImage) : [parse(cs.color)].filter(Boolean);
      for (const bg of backdrops(gradientText ? el.parentElement : el)) {
        for (const fg of fgs) {
          const r = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
          if (worst === null || r < worst) worst = +r.toFixed(2);
        }
      }
    }
    return worst;
  };

  // --- Focus: every control takes focus and something visibly changes when it does. ---
  const CONTROLS = 'a[href], button:not([tabindex="-1"]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), [role=tab]';
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[aria-hidden=true]") && !el.disabled;
  };
  const look = (el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.backgroundColor, s.textDecorationLine].join("|");
  };
  const focusGaps = () => {
    const gaps = [];
    for (const el of [...document.querySelectorAll(CONTROLS)].filter(shown)) {
      el.blur();
      const before = look(el);
      el.focus({ preventScroll: true });
      if (document.activeElement !== el) continue;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || look(el) !== before;
      if (!ring) gaps.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 28));
    }
    return [...new Set(gaps)];
  };

  const rows = [];
  for (const route of routes) {
    history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await wait(settleMs);
    const res = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    });
    const passed = res.passes.find((p) => p.id === "color-contrast");
    const measured = (passed ? passed.nodes : []).map((n) => n.any[0]?.data?.contrastRatio).filter(Boolean);
    const gradient = res.incomplete.find((i) => i.id === "color-contrast");
    rows.push({
      route,
      title: document.title.split(" · ")[0],
      violations: res.violations.map((v) => `${v.id} x${v.nodes.length}`).join(", ") || "none",
      lowestContrast: measured.length ? Math.min(...measured) : null,
      gradientTextWorstCase: gradient ? gradientWorstCase(gradient.nodes) : null,
      withoutFocusIndicator: focusGaps().join(" | ") || "none",
    });
  }
  console.table(rows);
  return rows;
}
