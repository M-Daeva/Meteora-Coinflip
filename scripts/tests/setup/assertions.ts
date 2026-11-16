import { expect } from "vitest";

export function shouldFail(fn: () => unknown, errorMessage?: string): void {
  try {
    fn();
  } catch (e) {
    if (errorMessage) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).toContain(errorMessage);
    }

    return expect(0).toBe(0);
  }

  expect(0).toBe(1);
}

export async function shouldFailAsync(
  fn: () => Promise<unknown>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (errorMessage) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).toContain(errorMessage);
    }

    return expect(0).toBe(0);
  }

  expect(0).toBe(1);
}
