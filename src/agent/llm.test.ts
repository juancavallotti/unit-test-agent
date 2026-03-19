import { beforeEach, describe, expect, it, vi } from "vitest";

const chatOpenAICtor = vi.hoisted(() => vi.fn());
const chatOllamaCtor = vi.hoisted(() => vi.fn());

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: chatOpenAICtor,
}));

vi.mock("@langchain/ollama", () => ({
  ChatOllama: chatOllamaCtor,
}));

describe("getChat", () => {
  beforeEach(() => {
    vi.resetModules();
    chatOpenAICtor.mockReset();
    chatOllamaCtor.mockReset();
    delete process.env.OPENAI_MODEL;
    delete process.env.OLLAMA_MODEL;
  });

  it("creates and caches OpenAI chat with default model", async () => {
    chatOpenAICtor.mockImplementation((opts: unknown) => ({ provider: "openai", opts }));

    const { getChat } = await import("./llm.js");
    const first = getChat("openai");
    const second = getChat("openai");

    expect(chatOpenAICtor).toHaveBeenCalledTimes(1);
    expect(chatOpenAICtor).toHaveBeenCalledWith({ model: "gpt-5.4-mini" });
    expect(first).toBe(second);
  });

  it("uses OPENAI_MODEL when provided", async () => {
    process.env.OPENAI_MODEL = "gpt-test-model";
    chatOpenAICtor.mockImplementation((opts: unknown) => ({ provider: "openai", opts }));

    const { getChat } = await import("./llm.js");
    getChat("openai");

    expect(chatOpenAICtor).toHaveBeenCalledWith({ model: "gpt-test-model" });
  });

  it("creates Ollama chat with think=true and respects OLLAMA_MODEL", async () => {
    process.env.OLLAMA_MODEL = "qwen3:test";
    chatOllamaCtor.mockImplementation((opts: unknown) => ({ provider: "ollama", opts }));

    const { getChat } = await import("./llm.js");
    const first = getChat("ollama");
    const second = getChat("ollama");

    expect(chatOllamaCtor).toHaveBeenCalledTimes(1);
    expect(chatOllamaCtor).toHaveBeenCalledWith({ model: "qwen3:test", think: true });
    expect(first).toBe(second);
  });
});
