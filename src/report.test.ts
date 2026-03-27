import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printReport } from "./report.js";

describe("printReport", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("includes source, target coverage, and final coverage", () => {
    const state = {
      sourceFolder: "/go/project",
      targetCoverage: 80,
      currentCoverage: 65,
      selectedFiles: [],
      codeGenerationResults: [],
      compilationErrors: undefined,
      targetModel: "ollama",
      concurrency: 1,
      plannerResults: [],
    } as Parameters<typeof printReport>[0];
    printReport(state);
    const output = logSpy.mock.calls[0]?.[0] ?? "";
    expect(output).toContain("Source: /go/project");
    expect(output).toContain("Target coverage: 80%");
    expect(output).toContain("Final coverage: 65%");
    expect(output).toContain("Target not met.");
  });

  it("reports target met when currentCoverage >= targetCoverage", () => {
    const state = {
      sourceFolder: "/x",
      targetCoverage: 80,
      currentCoverage: 80,
      selectedFiles: [],
      codeGenerationResults: [],
      compilationErrors: undefined,
      targetModel: "ollama",
      concurrency: 1,
      plannerResults: [],
    } as Parameters<typeof printReport>[0];
    printReport(state);
    const output = logSpy.mock.calls[0]?.[0] ?? "";
    expect(output).toContain("Target met.");
  });

  it("includes compilation errors when present", () => {
    const state = {
      sourceFolder: "/x",
      targetCoverage: 80,
      currentCoverage: 50,
      selectedFiles: [],
      codeGenerationResults: [],
      compilationErrors: "undefined: Foo",
      targetModel: "ollama",
      concurrency: 1,
      plannerResults: [],
    } as Parameters<typeof printReport>[0];
    printReport(state);
    const output = logSpy.mock.calls[0]?.[0] ?? "";
    expect(output).toContain("Compilation/test errors:");
    expect(output).toContain("undefined: Foo");
  });

  it("includes selected files when present", () => {
    const state = {
      sourceFolder: "/x",
      targetCoverage: 80,
      currentCoverage: 50,
      selectedFiles: [
        { filename: "pkg/foo.go", uncoveredLines: 10, coverage: 60 },
      ],
      codeGenerationResults: [],
      compilationErrors: undefined,
      targetModel: "ollama",
      concurrency: 1,
      plannerResults: [],
    } as Parameters<typeof printReport>[0];
    printReport(state);
    const output = logSpy.mock.calls[0]?.[0] ?? "";
    expect(output).toContain("Last selected files:");
    expect(output).toContain("pkg/foo.go");
    expect(output).toContain("10 uncovered");
    expect(output).toContain("60.0% coverage");
  });

  it("includes code generation results when present", () => {
    const state = {
      sourceFolder: "/x",
      targetCoverage: 80,
      currentCoverage: 50,
      selectedFiles: [],
      codeGenerationResults: [
        { filename: "pkg/foo.go", success: true, message: "Done." },
        { filename: "pkg/bar.go", success: false, message: "Timeout" },
      ],
      compilationErrors: undefined,
      targetModel: "ollama",
      concurrency: 1,
      plannerResults: [],
    } as Parameters<typeof printReport>[0];
    printReport(state);
    const output = logSpy.mock.calls[0]?.[0] ?? "";
    expect(output).toContain("Code generation results:");
    expect(output).toContain("pkg/foo.go: OK");
    expect(output).toContain("Done.");
    expect(output).toContain("pkg/bar.go: FAIL");
    expect(output).toContain("Timeout");
  });
});
