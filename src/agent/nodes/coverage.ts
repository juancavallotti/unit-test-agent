/**
 * The coverage node.
 */

import { State } from "../state.js";
import { runExec } from "../../utils/exec.js";

export async function coverageNode(state: typeof State.State): Promise<typeof State.Update> {
    try {
        const { stdout, stderr } = await runExec(
            "go test -coverprofile=coverage.out",
            { cwd: state.sourceFolder }
        );

        if (hasNoTestFiles(stdout, stderr)) {
            console.log("[coverage] no test files found, defaulting coverage to 0%");
            return { currentCoverage: 0, compilationErrors: undefined };
        }

        if (stderr) {
            console.log("[coverage] test/compile failed, saving errors and routing to code generation");
            return { compilationErrors: stderr };
        }
        const coverage = parseCoverage(stdout ?? "");
        console.log("[coverage] current coverage:", `${coverage}%`);
        return { currentCoverage: coverage, compilationErrors: undefined };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "Coverage not found") throw err;

        if (typeof err !== "object" || err === null) {
            return { compilationErrors: msg };
        }

        const {stderr, stdout} = err as {stderr?: string, stdout?: string};

        if (hasNoTestFiles(stdout, stderr)) {
            console.log("[coverage] no test files found, defaulting coverage to 0%");
            return { currentCoverage: 0, compilationErrors: undefined };
        }

        if (typeof stderr === "string" && stderr.length > 0) {
            return { compilationErrors: stderr };
        } else if (typeof stdout === "string" && stdout.length > 0) {
            return { compilationErrors: stdout };
        } else {
            return { compilationErrors: msg };
        }
    }
}

function hasNoTestFiles(stdout?: string, stderr?: string): boolean {
    const out = `${stdout ?? ""}\n${stderr ?? ""}`;
    return out.includes("[no test files]");
}

function parseCoverage(coverage: string): number {
    //format: github.com/montanaflynn/stats		coverage: 0.0% of statements

    const percentage = coverage.match(/(\d+\.\d+)% of statements/);
    if (!percentage) {
        throw new Error("Coverage not found");
    }
    return parseFloat(percentage[1]);
}