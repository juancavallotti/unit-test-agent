import { MessagesValue, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const SelectedFileSchema = z.object({
    filename: z.string(),
    uncoveredLines: z.number(),
    coverage: z.number(),
});

const PlannerResultSchema = z.object({
    filename: z.string(),
    plan: z.string(),
});

/**
 * The state of the agent.
 */
export const State = new StateSchema({
    messages: MessagesValue,
    currentCoverage: z.int(),
    sourceFolder: z.string(),
    targetCoverage: z.int(),
    targetModel: z.enum(["ollama", "openai"]).default("openai"),
    selectedFiles: z.array(SelectedFileSchema).default(() => []),
    plannerResults: z.array(PlannerResultSchema).default(() => []),
})