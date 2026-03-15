import { extractReadmeQuickStart } from "./extract-quick-start";
import { writeFile } from "node:fs/promises";
import { givePort } from "./ports";

const quickStart = await extractReadmeQuickStart();

const examplePort = String(givePort("example"));

const testContent = {
  /** @link https://github.com/RobinTail/express-zod-api/issues/952 */
  issue952: quickStart.replace(/(?<!as )const/g, "export const"),
  cjs: quickStart.replace(examplePort, String(givePort("cjs"))),
  esm: quickStart.replace(examplePort, String(givePort("esm"))),
};

for (const testName in testContent) {
  await writeFile(
    `./${testName}-test/quick-start.ts`,
    testContent[testName as keyof typeof testContent],
  );
}
