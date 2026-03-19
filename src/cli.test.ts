import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fixture from "./fixture.md";

vi.mock("commander", () => {
  const program: Record<string, unknown> = {};
  program.name = vi.fn().mockReturnValue(program);
  program.description = vi.fn().mockReturnValue(program);
  program.version = vi.fn().mockReturnValue(program);
  program.command = vi.fn().mockReturnValue(program);
  program.option = vi.fn().mockReturnValue(program);
  program.action = vi.fn().mockReturnValue(program);
  program.parse = vi.fn();
  return { program };
});

vi.mock("./agent/graph.js", () => ({ runGraph: vi.fn() }));
vi.mock("./report.js", () => ({ printReport: vi.fn() }));
vi.mock("dotenv/config", () => ({}));

describe("cli", () => {
  it("loads .md files as string via import", () => {
    expect(typeof fixture).toBe("string");
    expect(fixture).toContain("# Fixture");
    expect(fixture).toContain("Hello from markdown");
  });

  describe("runCommand", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as () => never);

    beforeEach(async () => {
      vi.clearAllMocks();
      const { runGraph } = await import("./agent/graph.js");
      vi.mocked(runGraph).mockResolvedValue({
        sourceFolder: "/tmp",
        targetCoverage: 80,
        currentCoverage: 50,
        concurrency: 2,
      } as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
    });

    it("calls runGraph with opts when all options provided", async () => {
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      const { printReport } = await import("./report.js");
      await runCommand({
        src: "/my/project",
        coverage: "90",
        model: "ollama",
        concurrency: "3",
        recursionLimit: "100",
      });
      expect(vi.mocked(runGraph)).toHaveBeenCalledWith(
        "/my/project",
        90,
        "ollama",
        3,
        100
      );
      expect(printReport).toHaveBeenCalled();
    });

    it("uses default concurrency and recursion limit when not provided", async () => {
      const origEnv = process.env;
      process.env = { ...origEnv, SOURCE_FOLDER: "/env/path", TARGET_COVERAGE: "80" };
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await runCommand({});
      expect(vi.mocked(runGraph)).toHaveBeenCalledWith(
        "/env/path",
        80,
        "openai",
        2,
        50
      );
      process.env = origEnv;
    });

    it("options override env vars", async () => {
      const origEnv = process.env;
      process.env = {
        ...origEnv,
        SOURCE_FOLDER: "/env/path",
        TARGET_COVERAGE: "70",
        TARGET_MODEL: "openai",
        CONCURRENCY: "5",
        GRAPH_RECURSION_LIMIT: "25",
      };
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await runCommand({
        src: "/cli/path",
        coverage: "85",
        model: "ollama",
        concurrency: "1",
        recursionLimit: "30",
      });
      expect(vi.mocked(runGraph)).toHaveBeenCalledWith(
        "/cli/path",
        85,
        "ollama",
        1,
        30
      );
      process.env = origEnv;
    });

    it("exits when source folder is missing", async () => {
      const origEnv = process.env;
      process.env = { ...origEnv };
      delete process.env.SOURCE_FOLDER;
      process.env.TARGET_COVERAGE = "80";
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await expect(runCommand({})).rejects.toThrow("exit");
      expect(runGraph).not.toHaveBeenCalled();
      process.env = origEnv;
    });

    it("defaults target coverage to 20 when missing", async () => {
      const origEnv = process.env;
      process.env = { ...origEnv, SOURCE_FOLDER: "/x" };
      delete process.env.TARGET_COVERAGE;
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await runCommand({});
      expect(vi.mocked(runGraph)).toHaveBeenCalledWith(
        "/x",
        20,
        "openai",
        2,
        50
      );
      process.env = origEnv;
    });

    it("exits when coverage is out of range", async () => {
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await expect(
        runCommand({ src: "/x", coverage: "101" })
      ).rejects.toThrow("exit");
      await expect(
        runCommand({ src: "/x", coverage: "-1" })
      ).rejects.toThrow("exit");
      expect(runGraph).not.toHaveBeenCalled();
    });

    it("exits when concurrency is invalid", async () => {
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await expect(
        runCommand({ src: "/x", coverage: "80", concurrency: "0" })
      ).rejects.toThrow("exit");
      expect(runGraph).not.toHaveBeenCalled();
    });

    it("exits when recursion limit is invalid", async () => {
      const { runCommand } = await import("./cli.js");
      const { runGraph } = await import("./agent/graph.js");
      await expect(
        runCommand({ src: "/x", coverage: "80", recursionLimit: "0" })
      ).rejects.toThrow("exit");
      expect(runGraph).not.toHaveBeenCalled();
    });
  });
});
