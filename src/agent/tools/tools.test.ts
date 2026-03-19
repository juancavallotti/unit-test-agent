import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createCompileGoTool,
    createCreateFileTool,
    createPatchFileTool,
    createReadFileTool,
    resolveUnderSource,
} from "./index.js";

const runExecMock = vi.hoisted(() => vi.fn());
vi.mock("../../utils/exec.js", () => ({ runExec: runExecMock }));

describe("resolveUnderSource", () => {
    it("resolves paths inside the base", () => {
        const base = join(tmpdir(), "uta-resolve-test");
        const r = resolveUnderSource(base, "pkg/foo.go");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.fullPath).toBe(join(base, "pkg", "foo.go"));
    });

    it("rejects traversal outside the base", () => {
        const base = join(tmpdir(), "uta-resolve-safe");
        const r = resolveUnderSource(base, "../../etc/passwd");
        expect(r.ok).toBe(false);
    });
});

describe("file tools", () => {
    let dir: string;

    beforeEach(async () => {
        dir = join(tmpdir(), `uta-tools-${Date.now()}`);
        await mkdir(dir, { recursive: true });
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("read_file returns contents", async () => {
        await writeFile(join(dir, "a.txt"), "hello", "utf-8");
        const readTool = createReadFileTool(dir);
        const out = await readTool.invoke({ path: "a.txt" });
        expect(out).toBe("hello");
    });

    it("create_file writes nested path", async () => {
        const createTool = createCreateFileTool(dir);
        const out = await createTool.invoke({ path: "sub/b.txt", contents: "x" });
        expect(out).toContain("Wrote");
        expect(await readFile(join(dir, "sub/b.txt"), "utf-8")).toBe("x");
    });

    it("patch_file replaces all occurrences", async () => {
        await writeFile(join(dir, "c.txt"), "a a a", "utf-8");
        const patchTool = createPatchFileTool(dir);
        const out = await patchTool.invoke({
            path: "c.txt",
            old_string: "a",
            new_string: "b",
        });
        expect(out).toContain("Patched");
        expect(await readFile(join(dir, "c.txt"), "utf-8")).toBe("b b b");
    });

    it("patch_file does not modify when old_string missing", async () => {
        await writeFile(join(dir, "d.txt"), "same", "utf-8");
        const patchTool = createPatchFileTool(dir);
        const out = await patchTool.invoke({
            path: "d.txt",
            old_string: "nope",
            new_string: "x",
        });
        expect(out).toContain("not found");
        expect(await readFile(join(dir, "d.txt"), "utf-8")).toBe("same");
    });
});

describe("compile_go", () => {
    let dir: string;

    beforeEach(async () => {
        dir = join(tmpdir(), `uta-compile-go-${Date.now()}`);
        await mkdir(dir, { recursive: true });
        runExecMock.mockReset();
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("returns success when go build succeeds", async () => {
        runExecMock.mockResolvedValue({ stdout: "", stderr: "" });
        const compileTool = createCompileGoTool(dir);
        const out = await compileTool.invoke({ path: "main.go" });
        expect(out).toBe("Compiled successfully.");
        expect(runExecMock).toHaveBeenCalledWith("go build .", { cwd: dir });
    });

    it("returns compilation failed when stderr is non-empty", async () => {
        runExecMock.mockResolvedValue({ stdout: "", stderr: "undefined: Foo" });
        const compileTool = createCompileGoTool(dir);
        const out = await compileTool.invoke({ path: "pkg/foo.go" });
        expect(out).toContain("Compilation failed:");
        expect(out).toContain("undefined: Foo");
    });

    it("returns error when path is not a .go file", async () => {
        const compileTool = createCompileGoTool(dir);
        const out = await compileTool.invoke({ path: "main.txt" });
        expect(out).toBe("Error: path must be a .go file.");
        expect(runExecMock).not.toHaveBeenCalled();
    });

    it("rejects path escaping source directory", async () => {
        const compileTool = createCompileGoTool(dir);
        const out = await compileTool.invoke({ path: "../../etc/passwd" });
        expect(out).toBe("Path escapes the source directory.");
        expect(runExecMock).not.toHaveBeenCalled();
    });
});
