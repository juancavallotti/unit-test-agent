import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";

const cache = new Map<"ollama" | "openai", BaseChatModel>();

/**
 * Returns the chat model for the given provider. Instances are created on first use
 * so Ollama is not loaded when using OpenAI only.
 */
export function getChat(provider: "ollama" | "openai"): BaseChatModel {
    let model = cache.get(provider);
    const modelName = provider === "openai" ? OPENAI_MODEL : OLLAMA_MODEL;
    console.log("[llm] getting chat model for provider:", provider, "model:", modelName);
    if (!model) {
        if (provider === "openai") {
            model = new ChatOpenAI({ model: OPENAI_MODEL });
        } else {
            model = new ChatOllama({ model: OLLAMA_MODEL, think: true });
        }
        cache.set(provider, model);
    }
    return model;
}
