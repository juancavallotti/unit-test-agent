import "dotenv/config";
import { program } from "commander";

program
  .name("unit-test-agent")
  .description("Agent that creates unit tests in the golang")
  .version("1.0.0");

program.parse();
