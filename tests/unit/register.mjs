// Lets node:test load lib/ modules that use extensionless relative imports (bundler style).
import { register } from "node:module";
register("./resolve-ts.mjs", import.meta.url);
