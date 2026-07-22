import { hex, italic, whiteBright as wht } from "ansis";

const dedication = italic("for Jennie".padStart(22));

const yel = hex("#FCF434");
const pur = hex("#9C59D1");

const logo = [
  yel`                                      ,,${dedication}`,
  yel`           MMM"""AMV                `7MM`,
  yel`           M’   AMV                   MM`,
  yel`           `   AMV    ,pW"Wq.    ,M""bMM`,
  yel`              AMV    6W’   `Wb ,AP    MM`,
  wht`             AMV   , 8M     M8 8MI    MM`,
  wht`            AMV   ,M YA.   ,A9 `Mb    MM`,
  wht`           AMVmmmmMM  `Ybmd9’   `Wbmd"MML.`,
  wht` .M"""bgd                   `7MM                 mm`,
  wht`,MI    "Y                     MM                 MM`,
  pur``MMb.      ,pW"Wq.   ,p6"bo   MM  ,MP’ .gP"Ya  mmMMmm  ,pP"Ybd`,
  pur`  `YMMNq. 6W’   `Wb 6M’  OO   MM ;Y   ,M’   Yb   MM    8I   `"`,
  pur`.     `MM 8M     M8 8M        MM;Mm   8M""""""   MM    `YMMMa.`,
  pur`Mb     dM YA.   ,A9 YM.    ,  MM `Mb. YM.    ,   MM    L.   I8`,
  pur`P"Ybmmd"   `Ybmd9’   YMbmd’ .JMML. YA. `Mbmmd’   `Mbmo M9mmmP’`,
];

export const getStartupLogo = () => logo.join("\n");
