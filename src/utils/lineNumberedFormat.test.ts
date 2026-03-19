import { describe, expect, it } from "vitest";
import { formatContentWithLineNumbers } from "./lineNumberedFormat.js";

describe("formatContentWithLineNumbers", () => {
    it("formats empty string as single line 1 with no content", () => {
        expect(formatContentWithLineNumbers("")).toBe("0000 | ");
    });

    it("formats single line", () => {
        expect(formatContentWithLineNumbers("hello")).toBe("0000 | hello");
    });

    it("formats multiple lines", () => {
        expect(formatContentWithLineNumbers("a\nb\nc")).toBe(
            "0000 | a\n0001 | b\n0002 | c"
        );
    });

    it("formats content with empty lines", () => {
        expect(formatContentWithLineNumbers("first\n\nthird")).toBe(
            "0000 | first\n0001 | \n0002 | third"
        );
    });

    it("uses 1-based line numbers", () => {
        const out = formatContentWithLineNumbers("x\ny");
        expect(out).toContain("0000 | x");
        expect(out).toContain("0001 | y");
    });

    it("formats array input without splitting", () => {
        expect(formatContentWithLineNumbers(["alpha", "beta"])).toBe(
            "0000 | alpha\n0001 | beta"
        );
    });
});
