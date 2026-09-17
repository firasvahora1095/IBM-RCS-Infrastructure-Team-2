import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";
// Extends Vitest's `expect` with jest-dom matchers like `.toBeInTheDocument()`.
// Without this import, those matchers don't exist and every test using them
// fails with a confusing "not a function" error.
import "@testing-library/jest-dom/vitest";

// Adds axe-core's `toHaveNoViolations` matcher, so the *.a11y.test.tsx files
// catch real WCAG problems (missing labels, invalid ARIA, nested
// interactive controls) automatically instead of relying only on review.
expect.extend(toHaveNoViolations);

// Types the matcher for TypeScript. The type parameters must match Vitest
// 5's own `Matchers` declaration exactly, or the interfaces won't merge.
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- T is required to match Vitest's signature
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoViolations(): R;
  }
}

// jsdom doesn't implement ResizeObserver, but several Carbon components
// (ContentSwitcher, TextArea's counter, DataTable) create one on mount.
// A no-op stub is enough: tests assert behaviour, not measured layout.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
