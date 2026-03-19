import { describe, it, expect } from "vitest";
import fixture from "./fixture.md";

describe("cli", () => {
  it("loads .md files as string via import", () => {
    expect(typeof fixture).toBe("string");
    expect(fixture).toContain("# Fixture");
    expect(fixture).toContain("Hello from markdown");
  });
});
