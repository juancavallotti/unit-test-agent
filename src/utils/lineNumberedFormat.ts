/**
 * Format file content with 1-based line numbers so the agent can refer to lines consistently.
 * Output: for each line, "l: <n>\n<line>". Lines joined by newline.
 * Used by read_file and patch_file so both return content in the same format (e.g. after
 * patching, the agent sees the new line numbers and can patch again or reason about the file).
 */
export function formatContentWithLineNumbers(content: string): string {
    const lines = content.split("\n");
    return lines.map((line, i) => `l: ${i + 1}\n${line}`).join("\n");
}
