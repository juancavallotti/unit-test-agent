import { describe, expect, it } from "vitest";
import { formatContentWithLineNumbers } from "./lineNumberedFormat.js";

describe("formatContentWithLineNumbers", () => {
    it("formats empty string as single line 1 with no content", () => {
        expect(formatContentWithLineNumbers("")).toBe("l: 1\n");
    });

    it("formats single line", () => {
        expect(formatContentWithLineNumbers("hello")).toBe("l: 1\nhello");
    });

    it("formats multiple lines", () => {
        expect(formatContentWithLineNumbers("a\nb\nc")).toBe(
            "l: 1\na\nl: 2\nb\nl: 3\nc"
        );
    });

    it("formats content with empty lines", () => {
        expect(formatContentWithLineNumbers("first\n\nthird")).toBe(
            "l: 1\nfirst\nl: 2\n\nl: 3\nthird"
        );
    });

    it("uses 1-based line numbers", () => {
        const out = formatContentWithLineNumbers("x\ny");
        expect(out).toContain("l: 1\nx");
        expect(out).toContain("l: 2\ny");
    });
});
