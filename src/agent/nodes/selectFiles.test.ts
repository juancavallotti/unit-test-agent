import type { ChildProcess } from "child_process";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { State } from "../state.js";

const execMock = vi.fn();
vi.mock("child_process", () => ({
  exec: execMock,
}));

vi.mock("node:util", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:util")>();
  return {
    ...actual,
    promisify: vi.fn((fn: (...args: unknown[]) => void) => {
      return (cmd: string, opts: { cwd: string }) => {
        return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          fn(cmd, opts, (err: Error | null, stdout: string, stderr: string) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
          });
        });
      };
    }),
  };
});

const readFileMock = vi.fn();
vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

const { selectFilesNode } = await import("./selectFiles.js");

const COVERAGE_OUT_FIXTURE = `mode: set
github.com/montanaflynn/stats/correlation.go:8.61,13.24 3 0
github.com/montanaflynn/stats/correlation.go:13.24,15.3 1 0
github.com/montanaflynn/stats/correlation.go:17.2,17.14 1 1
github.com/montanaflynn/stats/correlation.go:17.14,19.3 1 1
github.com/montanaflynn/stats/other.go:1.1,5.2 10 10
`;

describe("selectFilesNode", () => {
  const baseState: typeof State.State = {
    sourceFolder: "/tmp/go-project",
    messages: [],
    currentCoverage: 0,
    targetCoverage: 80,
    selectedFiles: [],
    plannerResults: [],
  } as typeof State.State;

  beforeEach(() => {
    execMock.mockReset();
    readFileMock.mockReset();
  });

  it("runs go test -coverprofile and reads coverage.out from sourceFolder", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "", "");
      return {} as ChildProcess;
    });
    readFileMock.mockResolvedValue(COVERAGE_OUT_FIXTURE);

    await selectFilesNode(baseState);

    expect(execMock).toHaveBeenCalledWith(
      "go test -coverprofile=coverage.out",
      { cwd: "/tmp/go-project" },
      expect.any(Function)
    );
    expect(readFileMock).toHaveBeenCalledWith("/tmp/go-project/coverage.out", "utf-8");
  });

  it("parses coverage.out and returns selectedFiles sorted by uncoveredLines desc then coverage asc", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "", "");
      return {} as ChildProcess;
    });
    readFileMock.mockResolvedValue(COVERAGE_OUT_FIXTURE);

    const update = await selectFilesNode(baseState);

    expect(update.selectedFiles).toBeDefined();
    expect(update.selectedFiles!.length).toBeLessThanOrEqual(10);

    const files = update.selectedFiles!;
    expect(files.length).toBe(2);

    const correlation = files.find((f) => f.filename.includes("correlation.go"))!;
    const other = files.find((f) => f.filename.includes("other.go"))!;

    expect(correlation.uncoveredLines).toBe(4);
    expect(correlation.coverage).toBeCloseTo((2 / 6) * 100);

    expect(other.uncoveredLines).toBe(0);
    expect(other.coverage).toBe(100);

    expect(files[0]!.uncoveredLines).toBeGreaterThanOrEqual(files[1]!.uncoveredLines);
    if (files[0]!.uncoveredLines === files[1]!.uncoveredLines) {
      expect(files[0]!.coverage).toBeLessThanOrEqual(files[1]!.coverage);
    }
  });

  it("returns at most 10 files", async () => {
    const manyFiles = [
      "mode: set",
      ...Array.from({ length: 15 }, (_, i) => `pkg/file${i}.go:1.0,2.0 1 0`),
    ].join("\n");
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "", "");
      return {} as ChildProcess;
    });
    readFileMock.mockResolvedValue(manyFiles);

    const update = await selectFilesNode(baseState);

    expect(update.selectedFiles!.length).toBe(10);
  });

  it("throws when exec fails", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error, stdout: string, stderr: string) => void) => {
      cb(new Error("go: not found"), "", "");
      return {} as ChildProcess;
    });

    await expect(selectFilesNode(baseState)).rejects.toThrow("go: not found");
  });

  it("throws when coverage.out cannot be read", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "", "");
      return {} as ChildProcess;
    });
    readFileMock.mockRejectedValue(new Error("ENOENT"));

    await expect(selectFilesNode(baseState)).rejects.toThrow("Could not read coverage file");
  });
});
