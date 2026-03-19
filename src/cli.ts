#!/usr/bin/env node
import "dotenv/config";
import { program } from "commander";
import { runGraph } from "./agent/index.js";
import { printReport } from "./report.js";

export type RunOptions = {
  src?: string;
  coverage?: string;
  model?: string;
  concurrency?: string;
  recursionLimit?: string;
};

export async function runCommand(opts: RunOptions): Promise<void> {
  const sourceFolder = opts.src ?? process.env.SOURCE_FOLDER;
  const targetCoverageRaw = opts.coverage ?? process.env.TARGET_COVERAGE ?? "20";
  const targetModelRaw = opts.model ?? process.env.TARGET_MODEL;
  const concurrencyRaw = opts.concurrency ?? process.env.CONCURRENCY ?? "2";
  const recursionLimitRaw =
    opts.recursionLimit ?? process.env.GRAPH_RECURSION_LIMIT ?? "50";

  if (!sourceFolder) {
    console.error("Missing source folder. Set --src or SOURCE_FOLDER in .env");
    process.exit(1);
  }
  const coverageNum = Number.parseInt(targetCoverageRaw, 10);
  if (Number.isNaN(coverageNum) || coverageNum < 0 || coverageNum > 100) {
    console.error("Target coverage must be a number between 0 and 100");
    process.exit(1);
  }

  const concurrency = Number.parseInt(concurrencyRaw, 10);
  if (Number.isNaN(concurrency) || concurrency < 1) {
    console.error("Concurrency must be a positive integer");
    process.exit(1);
  }

  const recursionLimit = Number.parseInt(recursionLimitRaw, 10);
  if (Number.isNaN(recursionLimit) || recursionLimit < 1) {
    console.error("Recursion limit must be a positive integer");
    process.exit(1);
  }

  const model = targetModelRaw === "ollama" ? "ollama" : "openai";

  const result = await runGraph(
    sourceFolder,
    coverageNum,
    model,
    concurrency,
    recursionLimit
  );
  printReport(result);
}

program
  .name("unit-test-agent")
  .description("Agent that creates unit tests in the golang")
  .version("1.0.0");

program
  .command("run")
  .description(
    "Run the agent. Options override env (SOURCE_FOLDER, TARGET_COVERAGE, TARGET_MODEL, CONCURRENCY, GRAPH_RECURSION_LIMIT)."
  )
  .option("-s, --src <path>", "source folder (Go project root)")
  .option("-c, --coverage <0-100>", "target coverage percentage")
  .option("-m, --model <ollama|openai>", "model provider (ollama or openai)")
  .option("--concurrency <number>", "max concurrent plans/tests")
  .option("--recursion-limit <number>", "graph max recursion limit")
  .action(async (opts: RunOptions) => {
    try {
      await runCommand(opts);
    } catch (err) {
      const e = err as Error & { stdout?: string; stderr?: string };
      console.error("Error:", e.message);
      if (e.stderr) console.error("stderr:", e.stderr);
      if (e.stdout) console.error("stdout:", e.stdout);
      process.exit(1);
    }
  });

program.parse();
