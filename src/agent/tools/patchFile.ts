import { readFile, writeFile } from "node:fs/promises";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { formatContentWithLineNumbers } from "../../utils/lineNumberedFormat.js";
import { resolveUnderSource } from "./resolveUnderSource.js";

const PatchFileSchema = z.object({
    path: z
        .string()
        .describe("Path to the file relative to the source directory (graph state sourceFolder)."),
    start_line: z.number().int().min(1).describe("0-based inclusive start line of the range to replace."),
    end_line: z.number().int().min(1).describe("0-based inclusive end line of the range to replace."),
    new_lines: z.array(z.string()).describe("New lines to insert (replacing the range); each element is one line."),
});

/**
 * Structured tool: replace a line range in a file under the source directory with new lines.
 */
export function createPatchFileTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "patch_file",
        description:
            "Replace a range of lines in a file with new lines. Give start_line and end_line (1-based, inclusive) and an array new_lines. You can delete lines (fewer new_lines than range length) or insert extra lines (more new_lines). Returns the new file contents in the same format as read_file (each line prefixed with '<n> | '). Paths are relative to the source directory.",
        schema: PatchFileSchema,
        func: async (args) => {
            const { path: filePath, start_line: startLine, end_line: endLine, new_lines: newLines } = args;
            console.log("[tool] patch_file called with:", {
                path: filePath,
                start_line: startLine,
                end_line: endLine,
                new_linesLength: newLines.length,
            });
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            try {
                const content = await readFile(resolved.fullPath, "utf-8");
                const lines = content.split("\n");
                if (startLine > endLine) {
                    return "Error: start_line must be less than or equal to end_line; file was not modified.";
                }
                if (startLine < 1 || endLine > lines.length) {
                    return `Error: line range [${startLine}, ${endLine}] is out of bounds (file has ${lines.length} line(s)); file was not modified.`;
                }
                const before = lines.slice(0, startLine - 1);
                const after = lines.slice(endLine);
                const result = [...before, ...newLines, ...after].join("\n");
                await writeFile(resolved.fullPath, result, "utf-8");
                return `Patched file: ${filePath}\n\nNew file contents:\n\n${formatContentWithLineNumbers(result)}`;
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Error patching file: ${msg}`;
            }
        },
    });
}
