import "dotenv/config";
import { program } from "commander";
import { runGraph } from "./agent/graph.js";

program
  .name("unit-test-agent")
  .description("Agent that creates unit tests in the golang")
  .version("1.0.0");

program
  .command("run")
  .description("Run the agent with parameters from .env (SOURCE_FOLDER, TARGET_COVERAGE, TARGET_MODEL)")
  .action(async () => {
    const sourceFolder = process.env.SOURCE_FOLDER;
    const targetCoverage = process.env.TARGET_COVERAGE;
    const targetModel = process.env.TARGET_MODEL;

    if (!sourceFolder) {
      console.error("Missing SOURCE_FOLDER in .env");
      process.exit(1);
    }
    if (targetCoverage === undefined || targetCoverage === "") {
      console.error("Missing TARGET_COVERAGE in .env");
      process.exit(1);
    }
    const coverageNum = Number.parseInt(targetCoverage, 10);
    if (Number.isNaN(coverageNum) || coverageNum < 0 || coverageNum > 100) {
      console.error("TARGET_COVERAGE must be a number between 0 and 100");
      process.exit(1);
    }

    try {
      const result = await runGraph(sourceFolder, coverageNum);
      console.log(result);
    } catch (err) {
      const e = err as Error & { stdout?: string; stderr?: string };
      console.error("Error:", e.message);
      if (e.stderr) console.error("stderr:", e.stderr);
      if (e.stdout) console.error("stdout:", e.stdout);
      process.exit(1);
    }
  });

program.parse();
