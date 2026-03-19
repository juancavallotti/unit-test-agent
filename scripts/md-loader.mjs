/**
 * Node ESM loader: makes `import x from "./file.md"` return the file content as a string.
 * Registered via scripts/register-md.mjs so use: node --import ./scripts/register-md.mjs --import tsx ...
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function load(url, context, nextLoad) {
  if (url.endsWith(".md")) {
    const path = fileURLToPath(url);
    const content = readFileSync(path, "utf-8");
    return {
      format: "module",
      source: `export default ${JSON.stringify(content)};`,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
