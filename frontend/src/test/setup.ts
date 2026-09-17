// Extends Vitest's `expect` with jest-dom matchers like `.toBeInTheDocument()`.
// Without this import, those matchers don't exist and every test using them
// fails with a confusing "not a function" error.
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver, but several Carbon components
// (ContentSwitcher, TextArea's counter, DataTable) create one on mount.
// A no-op stub is enough: tests assert behaviour, not measured layout.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
