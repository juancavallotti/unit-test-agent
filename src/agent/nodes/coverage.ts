/**
 * The coverage node.
 */

import { State } from "../state.js";
import { runExec } from "../../utils/exec.js";

export async function coverageNode(state: typeof State.State): Promise<typeof State.Update> {
    const { stdout, stderr } = await runExec(
        "go test -coverprofile=coverage.out",
        { cwd: state.sourceFolder }
    );

    if (stderr) {
        throw new Error(`Coverage command failed: ${stderr}`);
    }
    const coverage = parseCoverage(stdout ?? "");
    return { currentCoverage: coverage };
}

function parseCoverage(coverage: string): number {
    //format: github.com/montanaflynn/stats		coverage: 0.0% of statements

    const percentage = coverage.match(/(\d+\.\d+)% of statements/);
    if (!percentage) {
        throw new Error("Coverage not found");
    }
    return parseFloat(percentage[1]);
}