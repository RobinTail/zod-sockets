import { hex, italic } from "ansis";
import * as R from "ramda";

const dedication = italic("for Sheila".padEnd(40));
const proud = "Proudly supports non-binary community.".padStart(57);

const georgia11 = `
                           ,,
MMM"""AMV                `7MM       .M"""bgd                   `7MM                 mm
M’   AMV                   MM      ,MI    "Y                     MM                 MM
`   AMV    ,pW"Wq.    ,M""bMM      `MMb.      ,pW"Wq.   ,p6"bo   MM  ,MP’ .gP"Ya  mmMMmm  ,pP"Ybd
   AMV    6W’   `Wb ,AP    MM        `YMMNq. 6W’   `Wb 6M’  OO   MM ;Y   ,M’   Yb   MM    8I   `"
  AMV   , 8M     M8 8MI    MM      .     `MM 8M     M8 8M        MM;Mm   8M""""""   MM    `YMMMa.
 AMV   ,M YA.   ,A9 `Mb    MM      Mb     dM YA.   ,A9 YM.    ,  MM `Mb. YM.    ,   MM    L.   I8
AMVmmmmMM  `Ybmd9’   `Wbmd"MML.    P"Ybmmd"   `Ybmd9’   YMbmd’ .JMML. YA. `Mbmmd’   `Mbmo M9mmmP’

${dedication}${proud}
`;

const getColorFn = R.cond([
  [R.gt(4), R.always(hex("#FCF434"))],
  [R.gt(5), R.always(hex("#FFF"))],
  [R.gt(8), R.always(hex("#9C59D1"))],
  [R.T, R.always(hex("#383838"))],
]);

export const getStartupLogo = () =>
  georgia11
    .split("\n")
    .map((line, index) => getColorFn(index)(line))
    .join("\n");
