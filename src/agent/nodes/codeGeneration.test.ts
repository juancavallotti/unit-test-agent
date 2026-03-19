import { beforeEach, describe, expect, it, vi } from "vitest";

const getChatMock = vi.hoisted(() => vi.fn());
const readToolInvokeMock = vi.hoisted(() => vi.fn());
const createReadFileToolMock = vi.hoisted(() => vi.fn());
const createCreateFileToolMock = vi.hoisted(() => vi.fn());
const createPatchFileToolMock = vi.hoisted(() => vi.fn());
const createCompileGoToolMock = vi.hoisted(() => vi.fn());
const createRunTestToolMock = vi.hoisted(() => vi.fn());

vi.mock("../llm.js", () => ({
  getChat: getChatMock,
}));

vi.mock("../tools/index.js", () => ({
  createReadFileTool: createReadFileToolMock,
  createCreateFileTool: createCreateFileToolMock,
  createPatchFileTool: createPatchFileToolMock,
  createCompileGoTool: createCompileGoToolMock,
  createRunTestTool: createRunTestToolMock,
}));

const { codeGenerationNode } = await import("./codeGeneration.js");

describe("codeGenerationNode", () => {
  const baseState = {
    sourceFolder: "/tmp/project",
    targetModel: "openai" as const,
    concurrency: 2,
    selectedFiles: [],
    plannerResults: [] as Array<{ filename: string; plan: string }>,
    codeGenerationResults: [],
    currentCoverage: 0,
    targetCoverage: 80,
    compilationErrors: undefined as string | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createReadFileToolMock.mockReturnValue({ name: "read_file", invoke: readToolInvokeMock });
    createCreateFileToolMock.mockReturnValue({ name: "create_file", invoke: vi.fn() });
    createPatchFileToolMock.mockReturnValue({ name: "patch_file", invoke: vi.fn() });
    createCompileGoToolMock.mockReturnValue({ name: "compile_go", invoke: vi.fn() });
    createRunTestToolMock.mockReturnValue({ name: "run_test", invoke: vi.fn() });
  });

  it("returns empty results when there are no tasks", async () => {
    const out = await codeGenerationNode(baseState as never);
    expect(out).toEqual({ codeGenerationResults: [] });
    expect(getChatMock).not.toHaveBeenCalled();
  });

  it("returns unsupported result when model cannot bind tools", async () => {
    getChatMock.mockReturnValue({});
    const out = await codeGenerationNode({
      ...baseState,
      plannerResults: [{ filename: "foo_test.go", plan: "add tests" }],
    } as never);

    expect(out.codeGenerationResults).toEqual([
      {
        filename: "foo_test.go",
        success: false,
        message: "Model does not support tool calling (bindTools).",
      },
    ]);
  });

  it("uses compilation error task when plannerResults is empty", async () => {
    const invoke = vi.fn().mockResolvedValue({ content: "fixed build errors" });
    getChatMock.mockReturnValue({
      bindTools: vi.fn(() => ({ invoke })),
    });

    const out = await codeGenerationNode({
      ...baseState,
      compilationErrors: "undefined: Foo",
      plannerResults: [],
    } as never);

    expect(invoke).toHaveBeenCalledTimes(1);
    const messages = invoke.mock.calls[0]?.[0] as Array<{ content: unknown }>;
    expect(String(messages[2]?.content)).toContain("Target file: (fix compilation errors)");
    expect(String(messages[2]?.content)).toContain("undefined: Foo");
    expect(out.codeGenerationResults).toEqual([
      { filename: "(fix compilation errors)", success: true, message: "fixed build errors" },
    ]);
  });

  it("executes tool calls and uses final model message", async () => {
    readToolInvokeMock.mockResolvedValue("0000 | package foo");
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        content: "",
        tool_calls: [{ id: "tc-1", name: "read_file", args: { path: "foo.go" } }],
      })
      .mockResolvedValueOnce({
        content: "done",
      });
    getChatMock.mockReturnValue({
      bindTools: vi.fn(() => ({ invoke })),
    });

    const out = await codeGenerationNode({
      ...baseState,
      plannerResults: [{ filename: "foo_test.go", plan: "read + generate tests" }],
    } as never);

    expect(readToolInvokeMock).toHaveBeenCalledWith({ path: "foo.go" });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(out.codeGenerationResults).toEqual([
      { filename: "foo_test.go", success: true, message: "done" },
    ]);
  });
});
