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
    // Match Node's exec __promisify__: resolves with { stdout, stderr }, not an array
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

const { coverageNode } = await import("./coverage.js");

describe("coverageNode", () => {
  const baseState: typeof State.State = {
    sourceFolder: "/tmp/go-project",
    currentCoverage: 0,
    targetCoverage: 80,
    targetModel: "openai",
    concurrency: 2,
    selectedFiles: [],
    plannerResults: [],
    codeGenerationResults: [],
    compilationErrors: undefined,
  } as typeof State.State;

  beforeEach(() => {
    execMock.mockReset();
  });

  it("runs go test -coverprofile in state.sourceFolder and returns parsed coverage", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "	github.com/montanaflynn/stats		coverage: 42.5% of statements", "");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);

    expect(execMock).toHaveBeenCalledWith(
      "go test -coverprofile=coverage.out",
      { cwd: "/tmp/go-project" },
      expect.any(Function)
    );
    expect(update).toMatchObject({ currentCoverage: 42.5 });
  });

  it("returns 0 when go output has 0.0% of statements", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "0.0% of statements", "");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);

    expect(update).toMatchObject({ currentCoverage: 0 });
  });

  it("saves compilation errors to state when exec fails and routes to code generation", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error, stdout: string, stderr: string) => void) => {
      cb(new Error("go: not found"), "", "");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);
    expect(update).toMatchObject({ compilationErrors: "go: not found" });
  });

  it("saves stderr to compilationErrors when go test writes to stderr", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "", "package foo: undefined: SomeCompilationError");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);
    expect(update).toMatchObject({ compilationErrors: "package foo: undefined: SomeCompilationError" });
  });

  it("throws when coverage output cannot be parsed", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "no percentage here", "");
      return {} as ChildProcess;
    });

    await expect(coverageNode(baseState)).rejects.toThrow("Coverage not found");
  });

  it("returns 0 coverage when go reports [no test files] on stdout", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "?   foo/bar   [no test files]", "");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);
    expect(update).toMatchObject({ currentCoverage: 0, compilationErrors: undefined });
  });

  it("returns 0 coverage when go reports [no test files] in stderr from exec error", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error & { stdout?: string; stderr?: string }, stdout: string, stderr: string) => void) => {
      const err = new Error("go test failed") as Error & { stdout?: string; stderr?: string };
      err.stdout = "?   foo/bar   [no test files]";
      err.stderr = "";
      cb(err, err.stdout, err.stderr);
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);
    expect(update).toMatchObject({ currentCoverage: 0, compilationErrors: undefined });
  });

  it("uses sourceFolder as cwd for go test", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "100.0% of statements", "");
      return {} as ChildProcess;
    });

    await coverageNode({
      ...baseState,
      sourceFolder: "/my/custom/path",
    } as typeof State.State);

    expect(execMock).toHaveBeenCalledWith(
      "go test -coverprofile=coverage.out",
      { cwd: "/my/custom/path" },
      expect.any(Function)
    );
  });
});
