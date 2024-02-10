import chalk from "chalk";
import ts from "typescript";
import { writeFile } from "node:fs/promises";
import { format } from "prettier";
const f = ts.factory;

/**
 * @author Georgia 11 by Richard Sabey <cryptic_fan@hotmail.com> 9.2003
 * */
const georgia11 = `
                           ,,
MMM"""AMV                `7MM       .M"""bgd                   `7MM                 mm
M’   AMV                   MM      ,MI    "Y                     MM                 MM
`   AMV    ,pW"Wq.    ,M""bMM      `MMb.      ,pW"Wq.   ,p6"bo   MM  ,MP’ .gP"Ya  mmMMmm  ,pP"Ybd
   AMV    6W’   `Wb ,AP    MM        `YMMNq. 6W’   `Wb 6M’  OO   MM ;Y   ,M’   Yb   MM    8I   `"
  AMV   , 8M     M8 8MI    MM      .     `MM 8M     M8 8M        MM;Mm   8M""""""   MM    `YMMMa.
 AMV   ,M YA.   ,A9 `Mb    MM      Mb     dM YA.   ,A9 YM.    ,  MM `Mb. YM.    ,   MM    L.   I8
AMVmmmmMM  `Ybmd9’   `Wbmd"MML.    P"Ybmmd"   `Ybmd9’   YMbmd’ .JMML. YA. `Mbmmd’   `Mbmo M9mmmP’
`;

const logo = georgia11
  .split("\n")
  .map((line, index) => {
    const color =
      index < 3 || index > 7
        ? chalk.blueBright
        : index < 4 || index > 5
          ? chalk.magentaBright
          : chalk.whiteBright;
    return color(line);
  })
  .join("\n");

const program = f.createVariableStatement(
  [f.createModifier(ts.SyntaxKind.ExportKeyword)],
  f.createVariableDeclarationList(
    [
      f.createVariableDeclaration(
        "getStartupLogo",
        undefined,
        undefined,
        f.createArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          undefined,
          f.createNoSubstitutionTemplateLiteral(logo),
        ),
      ),
    ],
    ts.NodeFlags.Const,
  ),
);

const filepath = "./src/startup-logo.ts";
const formatted = await format(
  ts
    .createPrinter()
    .printNode(
      ts.EmitHint.Unspecified,
      program,
      ts.createSourceFile(
        filepath,
        "",
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS,
      ),
    ),
  { filepath },
);
await writeFile(filepath, formatted);
