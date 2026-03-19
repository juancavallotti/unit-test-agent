import type { State } from "./agent/state.js";

/**
 * Print a human-readable report from the final graph state to stdout.
 */
export function printReport(state: typeof State.State): void {
    const lines: string[] = [];
    lines.push("--- Report ---");
    lines.push(`Source: ${state.sourceFolder}`);
    lines.push(`Target coverage: ${state.targetCoverage}%`);
    lines.push(`Final coverage: ${state.currentCoverage}%`);
    lines.push(
        state.currentCoverage >= state.targetCoverage
            ? "Target met."
            : "Target not met."
    );

    if (state.compilationErrors) {
        lines.push("");
        lines.push("Compilation/test errors:");
        lines.push(state.compilationErrors);
    }

    if (state.selectedFiles.length > 0) {
        lines.push("");
        lines.push("Last selected files:");
        for (const f of state.selectedFiles) {
            lines.push(`  - ${f.filename} (${f.uncoveredLines} uncovered, ${f.coverage.toFixed(1)}% coverage)`);
        }
    }

    if (state.codeGenerationResults.length > 0) {
        lines.push("");
        lines.push("Code generation results:");
        for (const r of state.codeGenerationResults) {
            const status = r.success ? "OK" : "FAIL";
            lines.push(`  - ${r.filename}: ${status}`);
            if (r.message) {
                lines.push(`    ${r.message}`);
            }
        }
    }

    lines.push("---");
    console.log(lines.join("\n"));
}
