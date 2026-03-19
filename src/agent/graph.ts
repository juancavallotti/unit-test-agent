import { StateGraph, START, END } from "@langchain/langgraph";
import { State } from "./state.js";
import { codeGenerationNode } from "./nodes/codeGeneration.js";
import { coverageNode } from "./nodes/coverage.js";
import { plannerNode } from "./nodes/planner.js";
import { selectFilesNode } from "./nodes/selectFiles.js";

type NodeFn = (state: typeof State.State) => Promise<typeof State.Update>;

function wrapWithLog(name: string, node: NodeFn): NodeFn {
    return async (state) => {
        console.log(`[agent] Entering node: ${name}`);
        try {
            return await node(state);
        } finally {
            console.log(`[agent] Exiting node: ${name}`);
        }
    };
}

export async function runGraph(
    sourceFolder: string,
    targetCoverage: number,
    targetModel: "ollama" | "openai" = "openai",
    concurrency: number = 2,
    recursionLimit: number = 50
): Promise<typeof State.State> {
    const graph = configureGraph(targetModel);
    const state: typeof State.State = {
        sourceFolder,
        targetCoverage,
        targetModel,
        concurrency,
        messages: [],
        currentCoverage: 0,
        selectedFiles: [],
        plannerResults: [],
        codeGenerationResults: [],
        compilationErrors: undefined,
    } as typeof State.State;
    console.log(`[agent] Starting graph (sourceFolder=${sourceFolder}, targetCoverage=${targetCoverage})`);
    const result = await graph.invoke(state, { recursionLimit });
    console.log("[agent] Graph finished.");
    return result;
}


function configureGraph(modelProvider: "ollama" | "openai") {
    return new StateGraph(State)
        .addNode("coverage", wrapWithLog("coverage", coverageNode))
        .addNode("selectUncoveredFiles", wrapWithLog("selectUncoveredFiles", selectFilesNode))
        .addNode("planner", wrapWithLog("planner", plannerNode))
        .addNode("codeGeneration", wrapWithLog("codeGeneration", codeGenerationNode))
        .addEdge(START, "coverage")
        .addConditionalEdges("coverage", (state) => {
            if (state.compilationErrors) return "codeGeneration";
            if (state.currentCoverage >= state.targetCoverage) return END;
            return "selectUncoveredFiles";
        })
        .addEdge("selectUncoveredFiles", "planner")
        .addEdge("planner", "codeGeneration")
        .addEdge("codeGeneration", "coverage")
        .compile();
}