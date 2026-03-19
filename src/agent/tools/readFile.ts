import { readFile as fsReadFile } from "node:fs/promises";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { formatContentWithLineNumbers } from "../../utils/lineNumberedFormat.js";
import { resolveUnderSource } from "./resolveUnderSource.js";

const ReadFileSchema = z.object({
    path: z
        .string()
        .describe("Path to the file relative to the source directory (graph state sourceFolder)."),
});

/**
 * Structured tool: read a UTF-8 file under the source directory.
 * Output format: for each line, "<n> | <line>" (1-based). Lines joined by newline.
 */
export function createReadFileTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "read_file",
        description:
            "Read the full contents of a text file under the project source directory. Output is in line-numbered format: each line is prefixed with '<n> |' then a newline then the line content (0-based). Paths are relative to that directory.",
        schema: ReadFileSchema,
        func: async (args) => {
            console.log("[tool] read_file called with:", JSON.stringify(args));
            const { path: filePath } = args;
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            try {
                const content = await fsReadFile(resolved.fullPath, "utf-8");
                return formatContentWithLineNumbers(content);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Error reading file: ${msg}`;
            }
        },
    });
}
