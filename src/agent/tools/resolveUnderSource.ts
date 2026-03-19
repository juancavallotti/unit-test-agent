import { resolve, relative } from "node:path";

/**
 * Resolve a path relative to the source directory and ensure it stays inside it.
 */
export function resolveUnderSource(
    sourceFolder: string,
    relativePath: string
): { ok: true; fullPath: string } | { ok: false; error: string } {
    const base = resolve(sourceFolder);
    const fullPath = resolve(base, relativePath);
    const rel = relative(base, fullPath);
    if (rel.startsWith("..") || rel === "..") {
        return { ok: false, error: "Path escapes the source directory." };
    }
    return { ok: true, fullPath };
}
