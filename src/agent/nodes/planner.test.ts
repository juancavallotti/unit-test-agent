import { beforeEach, describe, expect, it, vi } from "vitest";

const readInvokeMock = vi.hoisted(() => vi.fn());
const chatInvokeMock = vi.hoisted(() => vi.fn());
const getChatMock = vi.hoisted(() => vi.fn());

vi.mock("../tools/index.js", () => ({
  createReadFileTool: vi.fn(() => ({ invoke: readInvokeMock })),
}));

vi.mock("../llm.js", () => ({
  getChat: getChatMock,
}));

const { plannerNode } = await import("./planner.js");

describe("plannerNode", () => {
  const baseState = {
    sourceFolder: "/tmp/project",
    targetModel: "openai" as const,
    concurrency: 2,
    selectedFiles: [] as Array<{ filename: string; uncoveredLines: number; coverage: number }>,
    plannerResults: [],
    codeGenerationResults: [],
    currentCoverage: 0,
    targetCoverage: 80,
    compilationErrors: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getChatMock.mockReturnValue({ invoke: chatInvokeMock });
  });

  it("returns empty plannerResults when no selected files", async () => {
    const out = await plannerNode(baseState as never);
    expect(out).toEqual({ plannerResults: [] });
    expect(readInvokeMock).not.toHaveBeenCalled();
    expect(chatInvokeMock).not.toHaveBeenCalled();
  });

  it("returns error plan when source file cannot be read", async () => {
    readInvokeMock.mockResolvedValueOnce("Error reading file: missing source");

    const out = await plannerNode({
      ...baseState,
      selectedFiles: [{ filename: "foo.go", uncoveredLines: 10, coverage: 0 }],
    } as never);

    expect(out.plannerResults).toEqual([
      { filename: "foo.go", plan: "Error: Error reading file: missing source" },
    ]);
    expect(chatInvokeMock).not.toHaveBeenCalled();
  });

  it("adds no existing tests hint when *_test.go is missing", async () => {
    readInvokeMock
      .mockResolvedValueOnce("package foo\nfunc A() {}")
      .mockResolvedValueOnce("Error reading file: foo_test.go missing");
    chatInvokeMock.mockResolvedValue({ content: "Plan for tests" });

    const out = await plannerNode({
      ...baseState,
      selectedFiles: [{ filename: "foo.go", uncoveredLines: 3, coverage: 10 }],
    } as never);

    expect(chatInvokeMock).toHaveBeenCalledTimes(1);
    const messages = chatInvokeMock.mock.calls[0]?.[0] as Array<{ content: unknown }>;
    expect(String(messages[0]?.content)).toContain("no existing tests");
    expect(out.plannerResults).toEqual([{ filename: "foo.go", plan: "Plan for tests" }]);
  });

  it("includes existing tests in user message when present", async () => {
    readInvokeMock
      .mockResolvedValueOnce("package foo\nfunc A() {}")
      .mockResolvedValueOnce("package foo\nfunc TestA(t *testing.T) {}");
    chatInvokeMock.mockResolvedValue({ content: [{ text: "Use table tests." }] });

    const out = await plannerNode({
      ...baseState,
      selectedFiles: [{ filename: "foo.go", uncoveredLines: 1, coverage: 80 }],
    } as never);

    const messages = chatInvokeMock.mock.calls[0]?.[0] as Array<{ content: unknown }>;
    expect(String(messages[1]?.content)).toContain("Existing tests:");
    expect(out.plannerResults).toEqual([{ filename: "foo.go", plan: "Use table tests." }]);
  });
});
