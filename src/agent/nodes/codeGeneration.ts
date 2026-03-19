import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { getChat } from "../llm.js";
import prompt from "../prompts/codeGeneration.md";
import { State } from "../state.js";
import { createCompileGoTool } from "../tools/compileGo.js";
import { createCreateFileTool } from "../tools/createFile.js";
import { createPatchFileTool } from "../tools/patchFile.js";
import { createReadFileTool } from "../tools/readFile.js";

const MAX_AGENT_STEPS = 25;

function getTools(sourceFolder: string): StructuredToolInterface[] {
    return [
        createReadFileTool(sourceFolder),
        createCreateFileTool(sourceFolder),
        createPatchFileTool(sourceFolder),
        createCompileGoTool(sourceFolder),
    ];
}

function extractFinalMessage(messages: BaseMessage[]): string {
    const last = messages[messages.length - 1];
    if (!last) return "";
    const content = (last as { content?: unknown }).content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? ""))
            .join("");
    }
    return String(content ?? "");
}

export async function codeGenerationNode(
    state: typeof State.State
): Promise<typeof State.Update> {
    if (state.plannerResults.length === 0) {
        return { codeGenerationResults: [] };
    }

    const sourceFolder = state.sourceFolder;
    const model = getChat(state.targetModel ?? "openai");
    const tools = getTools(sourceFolder);
    const modelWithTools = model.bindTools?.(tools);
    if (!modelWithTools) {
        return {
            codeGenerationResults: state.plannerResults.map(({ filename }) => ({
                filename,
                success: false,
                message: "Model does not support tool calling (bindTools).",
            })),
        };
    }

    const systemPrompt = prompt;

    const results = await Promise.all(
        state.plannerResults.map(async (item) => {
            const { filename, plan } = item;
            try {
                const userContent = `Target file: ${filename}\n\nPlan:\n${plan}\n\nImplement the tests according to the plan. Use the tools to read, create, or patch files and to compile.`;
                let messages: BaseMessage[] = [
                    new SystemMessage(systemPrompt),
                    new HumanMessage(userContent),
                ];

                let steps = 0;
                while (steps < MAX_AGENT_STEPS) {
                    steps += 1;
                    const response = await modelWithTools.invoke(messages);
                    messages = [...messages, response];

                    const toolCalls = (response as { tool_calls?: Array<{ id?: string; name: string; args: Record<string, unknown> }> })
                        .tool_calls;
                    if (!toolCalls?.length) {
                        break;
                    }

                    const toolByName = new Map(tools.map((t) => [t.name, t]));
                    const toolMessages: BaseMessage[] = [];
                    for (const tc of toolCalls) {
                        const tool = toolByName.get(tc.name);
                        const tid = tc.id ?? `call_${steps}_${tc.name}`;
                        let content: string;
                        if (tool) {
                            try {
                                const out = await tool.invoke(tc.args);
                                content = typeof out === "string" ? out : JSON.stringify(out);
                            } catch (e) {
                                content = `Error: ${e instanceof Error ? e.message : String(e)}`;
                            }
                        } else {
                            content = `Unknown tool: ${tc.name}`;
                        }
                        toolMessages.push(
                            new ToolMessage({ content, tool_call_id: tid })
                        );
                    }
                    messages = [...messages, ...toolMessages];
                }

                const finalMessage = extractFinalMessage(messages);
                return {
                    filename,
                    success: true,
                    message: finalMessage || "Done.",
                };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                return { filename, success: false, message };
            }
        })
    );

    return { codeGenerationResults: results };
}
