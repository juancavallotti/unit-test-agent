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
    messages: [],
    currentCoverage: 0,
    targetCoverage: 80,
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
    expect(update).toEqual({ currentCoverage: 42.5 });
  });

  it("returns 0 when go output has 0.0% of statements", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "0.0% of statements", "");
      return {} as ChildProcess;
    });

    const update = await coverageNode(baseState);

    expect(update).toEqual({ currentCoverage: 0 });
  });

  it("throws when exec fails", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error, stdout: string, stderr: string) => void) => {
      cb(new Error("go: not found"), "", "");
      return {} as ChildProcess;
    });

    await expect(coverageNode(baseState)).rejects.toThrow("go: not found");
  });

  it("throws when coverage output cannot be parsed", async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, "no percentage here", "");
      return {} as ChildProcess;
    });

    await expect(coverageNode(baseState)).rejects.toThrow("Coverage not found");
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
