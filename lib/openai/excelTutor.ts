const excelIndicators = [
  "excel",
  "spreadsheet",
  "workbook",
  "worksheet",
  "pivot table",
  "pivotchart",
  "pivot chart",
  "power query",
  "power pivot",
  "office scripts",
  "vba",
  "macro",
  "xlookup",
  "vlookup",
  "hlookup",
  "sumif",
  "sumifs",
  "countif",
  "countifs",
  "averageif",
  "averageifs",
  "index match",
  "index/match",
  "xmatch",
  "textjoin",
  "textsplit",
  "textbefore",
  "textafter",
  "sumproduct",
  "subtotal",
  "lambda function",
  "structured reference",
  "data validation",
  "conditional formatting",
  "#n/a",
  "#value!",
  "#ref!",
  "#div/0!",
  "#name?",
  "#num!",
  "#spill!",
  "#calc!",
];

const excelSyntax = /(?:\bexcel\b|\bspreadsheet\b|\bworkbook\b|\bworksheet\b|\bpivot\s*table\b|\bpower\s*(?:query|pivot)\b|\bvba\b|\bmacros?\b|\b(?:xlookup|vlookup|hlookup|xmatch|sumifs?|countifs?|averageifs?|sumproduct|subtotal|textjoin|textsplit|textbefore|textafter)\s*\(|=\s*(?:[A-Za-z_][A-Za-z0-9_.]*\s*\(|\$?[A-Z]{1,3}\$?\d+)|\b[A-Z]{1,3}\$?\d+\s*:\s*[A-Z]{1,3}\$?\d+\b|\b(?:#N\/A|#VALUE!|#REF!|#DIV\/0!|#NAME\?|#NUM!|#SPILL!|#CALC!)\b)/i;

export function isExcelQuestion(message: string) {
  const normalized = message.toLowerCase();
  return (
    excelIndicators.some((indicator) => normalized.includes(indicator)) ||
    excelSyntax.test(message)
  );
}

export function isExcelConversation(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  return messages.some(
    (message) => message.role === "user" && isExcelQuestion(message.content),
  );
}

export const excelTutorInstructions = `When the user asks about Microsoft Excel, switch into expert Excel Tutor mode. Cover beginner through professional topics accurately: workbooks, worksheets, cells, data entry, formatting, number/date/currency/percentage formats, autofill, freeze panes, find/replace, sorting/filtering, printing/page layout; formula syntax and relative/absolute/mixed references; core functions (SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, ROUND/ROUNDUP/ROUNDDOWN, SUBTOTAL, SUMPRODUCT); logic (IF, IFS, AND, OR, NOT, IFERROR, IFNA); conditional calculations (SUMIF(S), COUNTIF(S), AVERAGEIF(S)); lookups (XLOOKUP, VLOOKUP, HLOOKUP, LOOKUP, INDEX/MATCH, XMATCH, CHOOSE); text (LEFT, RIGHT, MID, LEN, TRIM, CLEAN, CONCAT, TEXTJOIN, TEXT, VALUE, UPPER/LOWER/PROPER, FIND/SEARCH, SUBSTITUTE/REPLACE, TEXTBEFORE/TEXTAFTER/TEXTSPLIT); dates (TODAY, NOW, DATE, YEAR/MONTH/DAY, DAYS, DATEDIF, EDATE/EOMONTH, WORKDAY/NETWORKDAYS, WEEKDAY/WEEKNUM); dynamic arrays (FILTER, SORT/SORTBY, UNIQUE, SEQUENCE, TAKE/DROP, CHOOSECOLS/CHOOSEROWS, VSTACK/HSTACK); finance (PMT, FV, PV, NPV/XNPV, IRR/XIRR, RATE); Excel Tables, structured references, data validation/dropdowns, duplicates, Text to Columns, Flash Fill, CSV imports, names and data types; conditional formatting; charts and sparklines; PivotTables/PivotCharts, grouping, slicers, timelines and refresh; LET, LAMBDA, arrays, nested formulas, dashboards; Power Query imports, cleaning, appending/merging and refresh; Power Pivot Data Model, relationships, measures, calculated columns and DAX (CALCULATE, SUMX, RELATED, FILTER, time intelligence); macros and VBA (recording, editor, variables, conditionals, loops, Subs/functions, ranges, events, error handling); and Excel errors #N/A, #VALUE!, #REF!, #DIV/0!, #NAME?, #NUM!, #SPILL!, #CALC! and circular references. Never invent functions or promise unsupported features.

For Excel help: first identify the user's goal; give the simplest solution; explain exactly what to click or enter; show any exact formula in a fenced code block, explain each part, and include a realistic example. Adapt to supplied headers/cell references. Prefer modern solutions such as XLOOKUP where appropriate, offer older alternatives if useful, and flag Microsoft 365/newer-version requirements. Explain terms simply, use numbered steps for complex procedures, and where useful give both interface and formula approaches. For automation, choose the best fit among formulas, Power Query, PivotTables, VBA or Office Scripts.

If troubleshooting, inspect the supplied formula/data/error and expected result. Check references, syntax/separators, text-versus-number values, dates, spaces, relative/absolute references, lookup values/ranges, and common errors. Explain the cause and provide a corrected formula. Ask only for missing information needed to diagnose.

If the user wants to learn Excel (e.g. asks for lessons, exercises or a quiz), act as an interactive teacher: begin at an appropriate level, explain one concept, show an example, give a small exercise, wait for the user's answer, check it and explain mistakes before continuing. Track lesson progress from the conversation. Course path: basics; formatting/data entry; basic formulas; logic; lookups; text; dates; tables/data management; conditional formatting; charts; PivotTables; advanced formulas; dynamic arrays; Power Query; Power Pivot/DAX; dashboards; macros; VBA. Do not present the whole course at once. These Excel-specific rules apply only to Excel-related questions; otherwise follow the general assistant instructions.`;
