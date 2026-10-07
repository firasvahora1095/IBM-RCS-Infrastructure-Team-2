// UX audit scan (docs/ux/ux-audit-checklist.md, rules A1, A4, A8, B1, D1).
// Paste into the browser console on any screen, or run through DevTools
// automation. Reports what is visible right now, so run it once per view
// state. Modals are checked as their own screen.
(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const openModal = [...document.querySelectorAll(".cds--modal.is-visible")].find(visible);
  const scope = openModal ?? document;
  const inScope = (el) => visible(el) && (openModal ? openModal.contains(el) : !el.closest(".cds--modal"));
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");

  const primaries = [...scope.querySelectorAll(".cds--btn--primary")].filter(inScope).map(label);
  const dangers = [...scope.querySelectorAll(".cds--btn--danger, .cds--btn--danger--tertiary, .cds--btn--danger--ghost")]
    .filter(inScope)
    .map(label);
  const navPrimaries = [...scope.querySelectorAll("a.cds--btn--primary")]
    .filter(inScope)
    .map(label)
    .filter((t) => /^(back|view|go to|open)\b/i.test(t));
  const generic = [...scope.querySelectorAll(".cds--btn")]
    .filter(inScope)
    .map(label)
    .filter((t) => /^(ok|submit|click here|yes|no|go)$/i.test(t));

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).filter((h) => !h.closest(".cds--modal"));
  const levels = headings.map((h) => Number(h.tagName[1]));
  const skips = levels.flatMap((l, i) => (i > 0 && l > levels[i - 1] + 1 ? [`h${levels[i - 1]}→h${l} "${label(headings[i]).slice(0, 40)}"`] : []));

  const unlabelled = [...scope.querySelectorAll("input:not([type=hidden]), select, textarea")]
    .filter(inScope)
    .filter((el) => {
      const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      return !id && !el.closest("label") && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby");
    })
    .map((el) => el.name || el.type);

  return {
    screen: location.pathname + location.search + (openModal ? " [modal]" : ""),
    primaries,
    A1_ok: primaries.length <= 1,
    dangers,
    A4_navPrimaries: navPrimaries,
    A8_generic: generic,
    B1_h1: levels.filter((l) => l === 1).length,
    B1_skips: skips,
    D1_unlabelled: unlabelled,
  };
})();
