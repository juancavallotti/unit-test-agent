import { ChatOllama } from "@langchain/ollama";

const MODEL = "qwen2.5-coder:14b";

/** Singleton ChatOllama instance, shared across the agent. */
export const chatOllama = new ChatOllama({ model: MODEL });
