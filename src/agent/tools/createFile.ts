import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { resolveUnderSource } from "./resolveUnderSource.js";

const CreateFileSchema = z.object({
    path: z
        .string()
        .describe("Path to the new file relative to the source directory (graph state sourceFolder)."),
    contents: z.string().describe("Full file contents to write."),
});

/**
 * Structured tool: create a file (and parent directories) under the source directory.
 */
export function createCreateFileTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "create_file",
        description:
            "Create or overwrite a file under the project source directory with the given contents. Parent directories are created if needed. Paths are relative to the source directory.",
        schema: CreateFileSchema,
        func: async ({ path: filePath, contents }) => {
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            try {
                await mkdir(dirname(resolved.fullPath), { recursive: true });
                await writeFile(resolved.fullPath, contents, "utf-8");
                return `Wrote file: ${filePath}`;
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Error creating file: ${msg}`;
            }
        },
    });
}
