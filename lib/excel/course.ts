export type ExcelVersion = "modern" | "legacy";
export type Lesson = {
  id: string;
  title: string;
  level: "Foundations" | "Formulas" | "Analysis";
  minutes: number;
  goal: string;
  steps: string[];
  example: string;
  task: string;
  hint: string;
  answer: string;
  accepted: string[];
  explanation: string;
  choices?: string[];
  legacy?: {
    example: string;
    task: string;
    hint: string;
    answer: string;
    accepted: string[];
    explanation: string;
  };
};
export const practiceRows = [
  ["Product", "Region", "Units", "Unit price", "Revenue"],
  ["Notebook", "Gauteng", "12", "35", "420"],
  ["Pen", "Western Cape", "30", "8", "240"],
  ["Folder", "Gauteng", "10", "22", "220"],
  ["Marker", "KwaZulu-Natal", "15", "18", "270"],
  ["Paper", "Gauteng", "8", "65", "520"],
];
export const lessons: Lesson[] = [
  {
    id: "cells",
    title: "Find your way around",
    level: "Foundations",
    minutes: 4,
    goal: "Read cell addresses and select a range confidently.",
    steps: [
      "Download the practice CSV and open it in Excel. The same data appears below.",
      "Columns run across as A, B, C; rows run down as 1, 2, 3. A cell address combines the column letter and row number.",
      "A range such as C2:C6 includes both end cells and everything between them. Row 1 contains headings, not sales.",
    ],
    example:
      "C2 contains 12: the number of notebooks sold. A2:A6 contains the five product names.",
    task: "Which cell contains the unit price of the Folder? Enter its cell address.",
    hint: "Folder is on row 4. Unit price is in column D.",
    answer: "D4",
    accepted: ["D4", "$D$4"],
    explanation: "D4 is column D, row 4. Its value is 22.",
  },
  {
    id: "format",
    title: "Make numbers readable",
    level: "Foundations",
    minutes: 5,
    goal: "Show currency while keeping values usable in calculations.",
    steps: [
      "Select D2:E6, then open Format Cells (right-click the selection).",
      "Choose Currency, select the rand symbol if available, and use two decimal places. The exact menu wording varies by Excel version.",
      "Formatting changes the display, not the underlying number. Save a copy as an Excel Workbook (.xlsx) to keep formatting; CSV cannot preserve it.",
    ],
    example:
      "A value of 35 can display as R35.00 and still be multiplied in a formula.",
    task: "What is the best way to display prices in rand and keep them numeric?",
    choices: [
      "Type R before every number",
      "Apply a Currency number format",
      "Change the cells to Text",
    ],
    hint: "Keep the original numeric values and change only how they display.",
    answer: "Apply a Currency number format",
    accepted: ["Apply a Currency number format"],
    explanation:
      "Currency formatting leaves the numbers available for arithmetic. Typing symbols may create text depending on your settings.",
  },
  {
    id: "multiply",
    title: "Write your first formula",
    level: "Formulas",
    minutes: 5,
    goal: "Calculate revenue from units and price.",
    steps: [
      "Click E2. Formulas begin with an equals sign.",
      "Replace the existing revenue value with =C2*D2, then press Enter. The asterisk means multiply.",
      "Drag E2's small fill handle down to E6. Relative references change to match each row. Work in a saved .xlsx copy.",
    ],
    example: "=C2*D2 calculates 12 × 35 and returns 420.",
    task: "Using multiplication and cell references, write the revenue formula for row 4.",
    hint: "Multiply units in C4 by unit price in D4. Start with =.",
    answer: "=C4*D4",
    accepted: ["=C4*D4", "=D4*C4"],
    explanation:
      "10 folders × R22 gives R220. The references should both use row 4.",
  },
  {
    id: "sum",
    title: "Add it up with SUM",
    level: "Formulas",
    minutes: 5,
    goal: "Calculate a total without adding cells one by one.",
    steps: [
      "Choose E8, below the sales rows, so the total is outside the range being added.",
      "SUM adds numbers in a range. A colon means all cells between two addresses.",
      "Enter =SUM(E2:E6). Avoid including E8 in its own formula: that creates a circular reference.",
    ],
    example: "=SUM(C2:C6) returns 75 units sold.",
    task: "Using SUM and one continuous range, write the formula for total revenue from all five products.",
    hint: "Revenue is in column E. The first sale is row 2 and the last is row 6.",
    answer: "=SUM(E2:E6)",
    accepted: ["=SUM(E2:E6)", "=SUM($E$2:$E$6)"],
    explanation: "420 + 240 + 220 + 270 + 520 = R1,670.",
  },
  {
    id: "average",
    title: "Find an average",
    level: "Formulas",
    minutes: 4,
    goal: "Distinguish a total from a typical value.",
    steps: [
      "AVERAGE adds numeric values and divides by how many numeric values there are.",
      "Enter =AVERAGE(C2:C6) in an empty cell. It returns 15 units per product.",
      "Blank cells and text in a referenced range are ignored; numeric zeros count. Keep headings outside the range for clarity.",
    ],
    example: "=AVERAGE(E2:E6) divides total revenue of 1670 by five products.",
    task: "What number does =AVERAGE(E2:E6) return? Enter the number only.",
    hint: "Divide 1670 by 5.",
    answer: "334",
    accepted: ["334", "334.0", "334.00"],
    explanation:
      "The average revenue per product is R334. It is not the average price per unit.",
  },
  {
    id: "absolute",
    title: "Lock a reference",
    level: "Formulas",
    minutes: 6,
    goal: "Keep a single rate fixed when copying formulas.",
    steps: [
      "Put Discount rate in G1 and 10% in H1. These are new cells beside the practice table.",
      "Put Discount amount in F1. In F2 enter =E2*$H$1.",
      "Copy F2 down. E2 changes with the row, while $H$1 stays locked. The dollar signs lock the column and the row.",
    ],
    example:
      "=E2*$H$1 returns 42, the discount amount on notebook revenue. It is not the final discounted revenue.",
    task: "Write the discount amount formula for row 3, locking both the column and row of H1.",
    hint: "Use E3 for revenue and $H$1 for the rate.",
    answer: "=E3*$H$1",
    accepted: ["=E3*$H$1", "=$H$1*E3"],
    explanation:
      "The result is R24. Copying the formula preserves the reference to the 10% rate.",
  },
  {
    id: "if",
    title: "Make a decision with IF",
    level: "Formulas",
    minutes: 6,
    goal: "Return different labels based on a condition.",
    steps: [
      "IF takes a condition, a result when true, and a result when false.",
      "Text results need straight double quotation marks. Numbers and cell references do not.",
      "Use >= for greater than or equal to. Excel may use semicolons instead of commas for argument separators; this checker accepts either.",
    ],
    example: '=IF(C2>=10,"Bulk","Small") returns Bulk because C2 contains 12.',
    task: 'Using IF, label E2 as "High" when revenue is at least 400, otherwise "Low". Write the formula.',
    hint: 'The condition is E2>=400. The true result is "High" and the false result is "Low".',
    answer: '=IF(E2>=400,"High","Low")',
    accepted: ['=IF(E2>=400,"High","Low")'],
    explanation:
      "E2 is 420, so the result is High. Revenue of exactly 400 must also count as High.",
  },
  {
    id: "sumif",
    title: "Total a single region",
    level: "Analysis",
    minutes: 6,
    goal: "Add only rows that meet a condition.",
    steps: [
      "SUMIF uses a criteria range, a criterion, and a sum range.",
      "Our regions are in B2:B6 and revenue is in E2:E6. Both ranges must line up row for row.",
      'Place text criteria in quotes, for example "Gauteng". Keep totals outside the practice table.',
    ],
    example: '=SUMIF(B2:B6,"Western Cape",E2:E6) returns 240.',
    task: "Using SUMIF, write the formula for total Gauteng revenue. Use the ranges B2:B6 and E2:E6.",
    hint: 'Use B2:B6 first, then "Gauteng", then E2:E6.',
    answer: '=SUMIF(B2:B6,"Gauteng",E2:E6)',
    accepted: ['=SUMIF(B2:B6,"Gauteng",E2:E6)'],
    explanation:
      "Notebook, Folder and Paper are the Gauteng rows: 420 + 220 + 520 = R1,160.",
  },
  {
    id: "lookup",
    title: "Look up a product",
    level: "Analysis",
    minutes: 7,
    goal: "Find a price by matching a product name exactly.",
    steps: [
      "Choose the Excel version above. Microsoft 365 and Excel 2021/2024 support XLOOKUP; Excel 2016/2019 use the VLOOKUP version of this exercise.",
      "A lookup searches for a key, such as a product name, then returns a related value.",
      "Exact matching avoids a nearby but incorrect result. Our product names are unique. A missing exact match returns #N/A in these examples.",
    ],
    example:
      '=XLOOKUP("Notebook",A2:A6,D2:D6) returns 35. XLOOKUP uses exact match by default.',
    task: 'Using XLOOKUP with three arguments, find the unit price of "Marker" in A2:A6 and D2:D6.',
    hint: 'The lookup value is "Marker", the search range is A2:A6, and the return range is D2:D6.',
    answer: '=XLOOKUP("Marker",A2:A6,D2:D6)',
    accepted: ['=XLOOKUP("Marker",A2:A6,D2:D6)'],
    explanation: "Marker is on row 5, so the returned unit price is R18.",
    legacy: {
      example:
        '=VLOOKUP("Notebook",A2:D6,4,FALSE) returns 35. FALSE requests an exact match.',
      task: 'Using VLOOKUP, find the unit price of "Marker" in A2:D6. Use column 4 and FALSE for an exact match.',
      hint: 'Use "Marker", then A2:D6, then 4, then FALSE.',
      answer: '=VLOOKUP("Marker",A2:D6,4,FALSE)',
      accepted: [
        '=VLOOKUP("Marker",A2:D6,4,FALSE)',
        '=VLOOKUP("Marker",A2:D6,4,0)',
      ],
      explanation:
        "The fourth column of A2:D6 is Unit price. The exact Marker match returns R18.",
    },
  },
  {
    id: "filter",
    title: "Filter without losing rows",
    level: "Analysis",
    minutes: 5,
    goal: "Show one region while keeping the full data set.",
    steps: [
      "Select A1:E6, including headings, and choose Data → Filter.",
      "Open the Region filter and select only Gauteng. You should see Notebook, Folder and Paper.",
      "Clear the filter to show every row again. Filtering hides rows; it does not delete them. A normal SUM still includes hidden rows.",
    ],
    example:
      "Filtering Gauteng displays three product rows. All five original product rows remain in the worksheet.",
    task: "After filtering Gauteng, how many product rows remain in the underlying data (including hidden rows)?",
    hint: "Two rows are hidden, not deleted.",
    answer: "5",
    accepted: ["5", "five"],
    explanation:
      "All five remain. Clear the filter and the other two reappear.",
  },
  {
    id: "pivot",
    title: "Build a regional summary",
    level: "Analysis",
    minutes: 8,
    goal: "Summarise revenue with a PivotTable.",
    steps: [
      "Clear any filters, select A1:E6, then choose Insert → PivotTable and place it on a new worksheet.",
      "Drag Region to Rows and Revenue to Values. Ensure Values says Sum of Revenue, not Count. A Count can indicate numbers stored as text.",
      "Check the regional totals against the source data. After editing source values, refresh the PivotTable. Adding rows may also require expanding the source range.",
    ],
    example:
      "Your summary should show Gauteng 1160, KwaZulu-Natal 270, Western Cape 240, and Grand Total 1670.",
    task: "Which Values calculation is appropriate for total revenue by region?",
    choices: ["Count of Revenue", "Sum of Revenue", "Max of Revenue"],
    hint: "We want to add revenue, not count sales rows or find the largest sale.",
    answer: "Sum of Revenue",
    accepted: ["Sum of Revenue"],
    explanation:
      "Sum adds each region's revenue. All regions together should total R1,670.",
  },
];
export function lessonForVersion(
  lesson: Lesson,
  version: ExcelVersion,
): Lesson {
  return version === "legacy" && lesson.legacy
    ? { ...lesson, ...lesson.legacy }
    : lesson;
}
// A guided answer checker, not a general Excel formula engine. Never eval user input.
// Preserve string literals (including spaces and case); normalise only formula syntax.
export function normaliseAnswer(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("=")) return trimmed.toLowerCase();
  return trimmed
    .split(/("(?:[^"]|"")*")/g)
    .map((part, i) =>
      i % 2 ? part : part.replace(/\s+/g, "").replace(/;/g, ",").toUpperCase(),
    )
    .join("");
}
export function checkAnswer(lesson: Lesson, answer: string) {
  return lesson.accepted.some(
    (candidate) => normaliseAnswer(candidate) === normaliseAnswer(answer),
  );
}
