/**
 * The coverage node.
 */

import { State } from "../state.js";

import { exec } from "child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export async function coverageNode(state: typeof State.State): Promise<typeof State.Update> {
    // Run the coverage command in the source folder.
    // promisify(exec) resolves with { stdout, stderr } (Node's custom promisify for exec)
    const { stdout, stderr } = await execPromise(
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