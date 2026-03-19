import { StateGraph, START, END } from "@langchain/langgraph";
import { State } from "./state.js";
import { coverageNode } from "./nodes/coverage.js";

async function runGraph(sourceFolder: string, targetCoverage: number, targetModel: "ollama" | "openai") {
    const graph = configureGraph(targetModel);
    const state: typeof State.State = {
        sourceFolder,
        targetCoverage,
    } as typeof State.State;
    const result = await graph.invoke(state);
    return result;
}


function configureGraph(modelProvider: "ollama" | "openai") {
    return new StateGraph(State)
        .addNode("coverage", coverageNode)
        .addEdge(START, "coverage")
        .addEdge("coverage", END)
        .compile();
}