import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./nodes/index.js", () => ({
  coverageNode: vi.fn(),
  selectFilesNode: vi.fn(),
  plannerNode: vi.fn(),
  codeGenerationNode: vi.fn(),
}));

const { runGraph } = await import("./graph.js");
const nodes = await import("./nodes/index.js");

const coverageNodeMock = vi.mocked(nodes.coverageNode);
const selectFilesNodeMock = vi.mocked(nodes.selectFilesNode);
const plannerNodeMock = vi.mocked(nodes.plannerNode);
const codeGenerationNodeMock = vi.mocked(nodes.codeGenerationNode);

describe("runGraph routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops when coverage is already satisfied", async () => {
    coverageNodeMock.mockResolvedValue({
      currentCoverage: 90,
      compilationErrors: undefined,
    });

    const result = await runGraph("/tmp/project", 80, "openai", 2, 20);

    expect(coverageNodeMock).toHaveBeenCalledTimes(1);
    expect(selectFilesNodeMock).not.toHaveBeenCalled();
    expect(plannerNodeMock).not.toHaveBeenCalled();
    expect(codeGenerationNodeMock).not.toHaveBeenCalled();
    expect(result.currentCoverage).toBe(90);
  });

  it("routes to codeGeneration first when build/test issue exists", async () => {
    coverageNodeMock
      .mockResolvedValueOnce({
        currentCoverage: 0,
        compilationErrors: "build failed",
      })
      .mockResolvedValueOnce({
        currentCoverage: 86,
        compilationErrors: undefined,
      });

    codeGenerationNodeMock.mockResolvedValue({
      codeGenerationResults: [
        { filename: "(fix compilation errors)", success: true, message: "fixed" },
      ],
      compilationErrors: undefined,
    });

    const result = await runGraph("/tmp/project", 80, "openai", 2, 20);

    expect(coverageNodeMock).toHaveBeenCalledTimes(2);
    expect(codeGenerationNodeMock).toHaveBeenCalledTimes(1);
    expect(selectFilesNodeMock).not.toHaveBeenCalled();
    expect(plannerNodeMock).not.toHaveBeenCalled();
    expect(result.currentCoverage).toBe(86);

    const firstCoverageOrder = coverageNodeMock.mock.invocationCallOrder[0];
    const codeGenerationOrder = codeGenerationNodeMock.mock.invocationCallOrder[0];
    const secondCoverageOrder = coverageNodeMock.mock.invocationCallOrder[1];
    expect(firstCoverageOrder).toBeLessThan(codeGenerationOrder);
    expect(codeGenerationOrder).toBeLessThan(secondCoverageOrder);
  });

  it("runs selectFiles -> planner -> codeGeneration when coverage is below target", async () => {
    coverageNodeMock
      .mockResolvedValueOnce({
        currentCoverage: 30,
        compilationErrors: undefined,
      })
      .mockResolvedValueOnce({
        currentCoverage: 85,
        compilationErrors: undefined,
      });

    selectFilesNodeMock.mockResolvedValue({
      selectedFiles: [{ filename: "stats/correlation.go", uncoveredLines: 12, coverage: 25 }],
    });
    plannerNodeMock.mockResolvedValue({
      plannerResults: [{ filename: "stats/correlation.go", plan: "Add table-driven tests." }],
    });
    codeGenerationNodeMock.mockResolvedValue({
      codeGenerationResults: [{ filename: "stats/correlation.go", success: true, message: "done" }],
    });

    const result = await runGraph("/tmp/project", 80, "openai", 2, 20);

    expect(coverageNodeMock).toHaveBeenCalledTimes(2);
    expect(selectFilesNodeMock).toHaveBeenCalledTimes(1);
    expect(plannerNodeMock).toHaveBeenCalledTimes(1);
    expect(codeGenerationNodeMock).toHaveBeenCalledTimes(1);
    expect(result.currentCoverage).toBe(85);

    const firstCoverageOrder = coverageNodeMock.mock.invocationCallOrder[0];
    const selectOrder = selectFilesNodeMock.mock.invocationCallOrder[0];
    const plannerOrder = plannerNodeMock.mock.invocationCallOrder[0];
    const codeGenerationOrder = codeGenerationNodeMock.mock.invocationCallOrder[0];
    const secondCoverageOrder = coverageNodeMock.mock.invocationCallOrder[1];

    expect(firstCoverageOrder).toBeLessThan(selectOrder);
    expect(selectOrder).toBeLessThan(plannerOrder);
    expect(plannerOrder).toBeLessThan(codeGenerationOrder);
    expect(codeGenerationOrder).toBeLessThan(secondCoverageOrder);
  });
});
