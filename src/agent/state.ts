import { MessagesValue, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

/**
 * The state of the agent.
 */
export const State = new StateSchema({
    messages: MessagesValue,
    currentCoverage: z.int(),
    sourceFolder: z.string(),
})