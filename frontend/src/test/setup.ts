// Extends Vitest's `expect` with jest-dom matchers like `.toBeInTheDocument()`.
// Without this import, those matchers don't exist and every test using them
// fails with a confusing "not a function" error.
import "@testing-library/jest-dom/vitest";
