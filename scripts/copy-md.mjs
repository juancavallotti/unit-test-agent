import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("../src", import.meta.url));
const distRoot = fileURLToPath(new URL("../dist", import.meta.url));

async function copyMarkdownTree(srcPath, distPath) {
  await mkdir(distPath, { recursive: true });
  const entries = await readdir(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const from = join(srcPath, entry.name);
    const to = join(distPath, entry.name);

    if (entry.isDirectory()) {
      await copyMarkdownTree(from, to);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      await cp(from, to);
    }
  }
}

await copyMarkdownTree(srcRoot, distRoot);
