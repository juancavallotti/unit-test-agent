/**
 * The selectFiles node: runs coverage, parses coverage.out, returns top 10 files by uncovered lines then coverage.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { State } from "../state.js";
import { runExec } from "../../utils/exec.js";

/** Per-file coverage entry for sorting and state. */
export type CoverageFile = {
    filename: string;
    uncoveredLines: number;
    coverage: number;
};

/** Regular expression to match coverage lines in the coverage file. */
/** Example line: github.com/montanaflynn/stats/correlation.go:8.61,13.24 3 0 */
/** The regex matches the filename, the start and end lines of the coverage, the number of statements, and the number of uncovered statements. */
const COVERAGE_LINE_RE = /^(.+?):[\d.]+,[\d.]+ (\d+) (\d+)$/;

/** Match `module <path>` in go.mod. */
const GO_MOD_MODULE_RE = /^module\s+(.+)\s*$/m;

/** The number of files to select. */
//TODO: make this configurable.
const TOP_N = 1; //one file for now so we can test.

async function getGoModulePath(sourceFolder: string): Promise<string | null> {
    const goModPath = join(sourceFolder, "go.mod");
    try {
        const content = await readFile(goModPath, "utf-8");
        const m = content.match(GO_MOD_MODULE_RE);
        return m ? m[1]!.trim() : null;
    } catch {
        return null;
    }
}

export async function selectFilesNode(state: typeof State.State): Promise<typeof State.Update> {
    
    //run the coverage command in the source folder.
    const { stdout, stderr } = await runExec(
        "go test -coverprofile=coverage.out",
        { cwd: state.sourceFolder }
    );

    //if the coverage command failed, throw an error.
    if (stderr) {
        throw new Error(`Coverage command failed: ${stderr}`);
    }

    //load the coverage file.
    const coveragePath = join(state.sourceFolder, "coverage.out");
    let raw: string;
    try {
        raw = await readFile(coveragePath, "utf-8");
    } catch {
        throw new Error(`Could not read coverage file: ${coveragePath}`);
    }

    const modulePath = await getGoModulePath(state.sourceFolder);
    const files = parseCoverageOut(raw, modulePath);

    //sort the files by uncovered lines then coverage.
    const sorted = sortByUncoveredThenCoverage(files);

    //select the top N files.
    const selectedFiles = sorted.slice(0, TOP_N);

    console.log(
        "[selectFiles] selected",
        selectedFiles.length,
        "file(s) to implement tests:",
        selectedFiles.map((f) => `${f.filename} (${f.uncoveredLines} uncovered, ${f.coverage.toFixed(1)}% coverage)`).join(", ")
    );

    //return the selected files.
    return { selectedFiles };
}

function parseCoverageOut(content: string, modulePath: string | null): CoverageFile[] {
    
    //split the coverage file into lines.
    const lines = content.trim().split("\n");
    if (lines.length === 0) return [];

    //create a map of files to their total lines and uncovered lines.
    const byFile = new Map<string, { total: number; uncovered: number }>();

    //iterate over the lines.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (i === 0 && line.startsWith("mode:")) continue;
        //if the line is not a coverage line, continue.
        const m = line.match(COVERAGE_LINE_RE);
        if (!m) continue;
        //if the line is a coverage line, parse the file, statements, and count.
        const [, filepath, stmtsStr, countStr] = m;
        const numStatements = Number.parseInt(stmtsStr!, 10);
        const count = Number.parseInt(countStr!, 10);
        //get the entry for the file, or create a new one if it doesn't exist.
        const entry = byFile.get(filepath!) ?? { total: 0, uncovered: 0 };
        //increment the total lines and uncovered lines.
        entry.total += numStatements;
        if (count === 0) entry.uncovered += numStatements;
        byFile.set(filepath!, entry);
    }

    const result: CoverageFile[] = [];
    const prefix = modulePath ? `${modulePath}/` : "";
    for (const [filepath, { total, uncovered }] of byFile) {
        const coverage = total > 0 ? ((total - uncovered) / total) * 100 : 0;
        const filename =
            prefix && filepath.startsWith(prefix)
                ? filepath.slice(prefix.length)
                : filepath.includes("/")
                  ? filepath.slice(filepath.lastIndexOf("/") + 1)
                  : filepath;
        result.push({ filename, uncoveredLines: uncovered, coverage });
    }
    return result;
}

function sortByUncoveredThenCoverage(files: CoverageFile[]): CoverageFile[] {
    return [...files].sort((a, b) => {
        if (b.uncoveredLines !== a.uncoveredLines) return b.uncoveredLines - a.uncoveredLines;
        return a.coverage - b.coverage;
    });
}
