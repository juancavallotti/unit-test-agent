import { defineConfig } from "vitest/config";

const markdownLoader = {
  name: "markdown-loader",
  transform(code: string, id: string) {
    if (id.endsWith(".md")) {
      return `export default ${JSON.stringify(code)};`;
    }
  },
};

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  },
  plugins: [markdownLoader],
});
