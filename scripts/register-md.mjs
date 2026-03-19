/**
 * Registers the .md loader via Node's register() so it runs in the same loader context as tsx.
 * Run with: node --import ./scripts/register-md.mjs --import tsx ...
 */
import { register } from "node:module";

const loaderPath = new URL("./md-loader.mjs", import.meta.url).href;
register(loaderPath, import.meta.url);
