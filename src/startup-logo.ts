import { hex, italic } from "ansis";
import { T, always, cond, gt } from "ramda";

const dedication = italic("for River".padEnd(20));
const proud = "Proudly supports non-binary community.".padStart(77);

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

const getColorFn = cond([
  [gt(4), always(hex("#FCF434"))],
  [gt(5), always(hex("#FFF"))],
  [gt(8), always(hex("#9C59D1"))],
  [T, always(hex("#2C2C2C"))],
]);

export const getStartupLogo = () =>
  georgia11
    .split("\n")
    .map((line, index) => getColorFn(index)(line))
    .join("\n");
