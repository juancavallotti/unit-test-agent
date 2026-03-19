import { readFile, writeFile } from "node:fs/promises";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { resolveUnderSource } from "./resolveUnderSource.js";

const PatchFileSchema = z.object({
    path: z
        .string()
        .describe("Path to the file relative to the source directory (graph state sourceFolder)."),
    old_string: z.string().describe("Exact substring to replace (all occurrences)."),
    new_string: z.string().describe("Replacement text."),
});

/**
 * Structured tool: search-and-replace all occurrences in a file under the source directory.
 */
export function createPatchFileTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "patch_file",
        description:
            "Replace every occurrence of old_string with new_string in a file under the project source directory. The file is unchanged if old_string is not found. Paths are relative to the source directory.",
        schema: PatchFileSchema,
        func: async ({ path: filePath, old_string: oldString, new_string: newString }) => {
            if (oldString.length === 0) {
                return "Error: old_string must not be empty.";
            }
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            try {
                const before = await readFile(resolved.fullPath, "utf-8");
                if (!before.includes(oldString)) {
                    return "Error: old_string was not found in the file; file was not modified.";
                }
                const after = before.split(oldString).join(newString);
                await writeFile(resolved.fullPath, after, "utf-8");
                return `Patched file: ${filePath}`;
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Error patching file: ${msg}`;
            }
        },
    });
}
