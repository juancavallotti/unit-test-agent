import { exec } from "child_process";
import { dirname } from "node:path";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as z from "zod";
import { resolveUnderSource } from "./resolveUnderSource.js";

function runTestExec(
    command: string,
    options: { cwd: string }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        exec(command, { ...options, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
            resolve({
                stdout: stdout ?? "",
                stderr: stderr ?? "",
                exitCode: err?.code ?? (err ? 1 : 0),
            });
        });
    });
}

const RunTestSchema = z.object({
    path: z
        .string()
        .describe(
            "Path to a .go file or directory in the package to test, relative to the source directory (e.g. 'foo.go' or 'pkg/sub')."
        ),
    run: z
        .string()
        .optional()
        .describe(
            "Optional test name pattern for -run (e.g. 'TestFoo' or 'TestBar/ case'). If omitted, all tests in the package are run."
        ),
});

/**
 * Structured tool: run tests for the Go package containing the given path via `go test -v`.
 * Runs from the source directory so module resolution works.
 */
export function createRunTestTool(sourceFolder: string): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: "run_test",
        description:
            "Run tests for the Go package containing the given file or directory using `go test -v`. Path is relative to the project source directory. Use -run to run a specific test by name (e.g. 'TestFoo'). Use this to verify tests pass after writing or changing them.",
        schema: RunTestSchema,
        func: async (args) => {
            const { path: filePath, run: runPattern } = args;
            console.log("[tool] run_test called with:", JSON.stringify(args));
            //resolve the path under the source folder.
            const resolved = resolveUnderSource(sourceFolder, filePath);
            if (!resolved.ok) return resolved.error;
            //get the package path.
            const pkgPath = filePath.endsWith(".go")
                ? dirname(filePath).replace(/\\/g, "/")
                : filePath.replace(/\\/g, "/");
            //if the package path is the root, use the root.
            const testTarget = pkgPath === "." ? "." : `./${pkgPath}`;

            //if there is a run pattern, add it to the command.
            const runArg = runPattern?.trim()
                ? ` -run ${JSON.stringify(runPattern.trim())}`
                : "";

            //build the command.
            const command = `go test -v${runArg} ${testTarget}`;
            const { stdout, stderr, exitCode } = await runTestExec(command, {
                cwd: sourceFolder,
            });

            //return the output.
            const out = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
            if (exitCode !== 0) {
                return out ? `Tests failed:\n${out}` : `Tests failed (exit code ${exitCode}).`;
            }
            return out ? `Tests passed.\n${out}` : "Tests passed.";
        },
    });
}
