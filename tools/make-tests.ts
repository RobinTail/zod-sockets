import { extractReadmeQuickStart } from "./extract-quick-start";
import { writeFile } from "node:fs/promises";

const quickStart = await extractReadmeQuickStart();

/** @link https://github.com/RobinTail/express-zod-api/issues/952 */
const issue952QuickStart = quickStart.replace(/(?<!as )const/g, "export const");

await writeFile("./cjs-test/quick-start.ts", quickStart);
await writeFile("./issue952-test/quick-start.ts", issue952QuickStart);
await writeFile("./esm-test/quick-start.ts", quickStart);
