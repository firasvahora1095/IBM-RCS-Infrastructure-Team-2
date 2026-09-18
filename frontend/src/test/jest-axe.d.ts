// Minimal types for the two jest-axe exports this project uses. The
// community @types/jest-axe package pulls in Jest's global type definitions,
// which conflict with Vitest's own `expect` types.
declare module "jest-axe" {
  import type { AxeResults, RunOptions } from "axe-core";

  export function axe(html: Element | string, options?: RunOptions): Promise<AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(results?: Partial<AxeResults>): { pass: boolean; message(): string };
  };
}
