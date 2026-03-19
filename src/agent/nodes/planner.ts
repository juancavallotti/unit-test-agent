import { State } from "../state.js";
import prompt from "../prompts/planner.md";

export async function plannerNode(state: typeof State.State): Promise<typeof State.Update> {
    return state;
}