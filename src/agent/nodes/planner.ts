import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChat } from "../llm.js";
import prompt from "../prompts/planner.md";
import { State } from "../state.js";
import { createReadFileTool } from "../tools/readFile.js";
import { runWithConcurrency } from "../../utils/runWithConcurrency.js";

function isReadFileError(content: string): boolean {
    return typeof content === "string" && content.startsWith("Error reading file:");
}

function getTestPath(sourcePath: string): string {
    return sourcePath.replace(/\.go$/, "_test.go");
}

export async function plannerNode(state: typeof State.State): Promise<typeof State.Update> {
    if (state.selectedFiles.length === 0) {
        return { plannerResults: [] };
    }

    const readFile = createReadFileTool(state.sourceFolder);
    const chat = getChat(state.targetModel ?? "openai");

    const concurrency = state.concurrency ?? 2;
    const results = await runWithConcurrency(state.selectedFiles, concurrency, async (selectedFile) => {
        const sourcePath = selectedFile.filename;
        const testPath = getTestPath(sourcePath);

        const sourceContent = await readFile.invoke({ path: sourcePath });
        const sourceText = typeof sourceContent === "string" ? sourceContent : String(sourceContent);
        if (isReadFileError(sourceText)) {
            return { filename: selectedFile.filename, plan: `Error: ${sourceText}` };
        }

        const testContent = await readFile.invoke({ path: testPath });
        const testText = typeof testContent === "string" ? testContent : String(testContent);
        const noTests = isReadFileError(testText) || !testText.trim();

        const systemContent = noTests
            ? `${prompt}\n\nno existing tests`
            : prompt;
        const userParts = [sourceText];
        if (!noTests) {
            userParts.push(`Existing tests:\n\n${testText}`);
        }
        const userContent = userParts.join("\n\n");

        const messages = [
            new SystemMessage(systemContent),
            new HumanMessage(userContent),
        ];
        const response = await chat.invoke(messages);
        const plan =
            typeof response.content === "string"
                ? response.content
                : Array.isArray(response.content)
                  ? response.content.map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? "")).join("")
                  : String(response.content);

        return { filename: selectedFile.filename, plan };
    });

    return { plannerResults: results };
}
