import { defineConfig } from "vite";

const markdownLoader = {
  name: "markdown-loader",
  transform(code: string, id: string) {
    if (id.endsWith(".md")) {
      return `export default ${JSON.stringify(code)};`;
    }
  },
};

export default defineConfig({
  build: {
    lib: {
      entry: "src/cli.ts",
      formats: ["es"],
      fileName: () => "cli.js",
    },
    outDir: "dist",
    target: "node18",
    minify: false,
    rollupOptions: {
      external: ["commander"],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [markdownLoader],
});
