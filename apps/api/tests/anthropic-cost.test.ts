import { describe, it, expect } from "vitest";
import { computeCostEur } from "../src/lib/anthropic-cost.js";

describe("computeCostEur", () => {
  it("computes sonnet-4-6 input+output correctly", () => {
    // 1M input @ $3 = $3, 1M output @ $15 = $15. Total $18 → ~16.56 EUR (rate 0.92).
    const c = computeCostEur("claude-sonnet-4-6", { input_tokens: 1_000_000, output_tokens: 1_000_000 });
    expect(c).toBeCloseTo(16.56, 2);
  });

  it("applies cache-read discount (10% of input price)", () => {
    // 1M cache-read @ 10% × $3/M = $0.30 → ~0.276 EUR.
    const c = computeCostEur("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
    });
    expect(c).toBeCloseTo(0.276, 3);
  });

  it("counts cache_creation as full input price", () => {
    // 1M cache_creation @ $3/M = $3 → ~2.76 EUR.
    const c = computeCostEur("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
    });
    expect(c).toBeCloseTo(2.76, 2);
  });

  it("returns 0 for unknown model", () => {
    expect(computeCostEur("claude-unknown", { input_tokens: 1000, output_tokens: 1000 })).toBe(0);
  });

  it("supports haiku-4-5 cheaper pricing", () => {
    // 1M input @ $0.80 = $0.80, 1M output @ $4 = $4. Total $4.80 → ~4.416 EUR.
    const c = computeCostEur("claude-haiku-4-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 });
    expect(c).toBeCloseTo(4.416, 2);
  });
});
