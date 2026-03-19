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

const CodeGenerationResultSchema = z.object({
    filename: z.string(),
    success: z.boolean(),
    message: z.string().optional(),
});

/**
 * The state of the agent.
 */
export const State = new StateSchema({
    currentCoverage: z.int(),
    sourceFolder: z.string(),
    targetCoverage: z.int(),
    targetModel: z.enum(["ollama", "openai"]).default("openai"),
    concurrency: z.number().min(1).default(2),
    selectedFiles: z.array(SelectedFileSchema).default(() => []),
    plannerResults: z.array(PlannerResultSchema).default(() => []),
    codeGenerationResults: z.array(CodeGenerationResultSchema).default(() => []),
    /** When set, coverage failed (e.g. compilation errors); graph routes to codeGeneration to patch tests. */
    compilationErrors: z.string().optional(),
})