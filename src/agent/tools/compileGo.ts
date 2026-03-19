import { dirname } from "node:path";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { runExec } from "../../utils/exec.js";
import { resolveUnderSource } from "./resolveUnderSource.js";

const CompileGoSchema = z.object({
    path: z
        .string()
        .describe("Path to the .go file to compile, relative to the source directory (graph state sourceFolder)."),
});

/**
 * Structured tool: compile the Go package containing the given file via `go build`.
 * Runs from the source directory so module resolution works.
 */
export function createCompileGoTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "compile_go",
        description:
            "Compile the Go package containing the given .go file using `go build`. Path is relative to the project source directory. Use this to verify that Go code compiles successfully.",
        schema: CompileGoSchema,
        func: async (args) => {
            console.log("[tool] compile_go called with:", JSON.stringify(args));
            const { path: filePath } = args;
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            if (!filePath.endsWith(".go")) {
                return "Error: path must be a .go file.";
            }
            const pkgPath = dirname(filePath).replace(/\\/g, "/");
            const buildTarget = pkgPath === "." ? "." : `./${pkgPath}`;
            try {
                const { stdout, stderr } = await runExec(`go build ${buildTarget}`, {
                    cwd: sourceFolder,
                });
                if (stderr.trim()) {
                    return `Compilation failed:\n${stderr.trim()}`;
                }
                return stdout.trim() ? `Compiled successfully.\n${stdout.trim()}` : "Compiled successfully.";
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Error compiling: ${msg}`;
            }
        },
    });
}
