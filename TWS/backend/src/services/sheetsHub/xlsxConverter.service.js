/**
 * Sheets Hub – converts between Univer's IWorkbookData JSON snapshot and a real .xlsx binary,
 * using the already-installed exceljs library (same lazy-require pattern as financeExportService.js).
 *
 * v1 fidelity ceiling (documented on purpose — do not silently pretend this is lossless):
 *   Best-effort, round-trips reasonably: cell values, formulas, bold/italic, font family/size,
 *   fill color, font color, basic (thin) borders, number formats, column widths, row heights,
 *   merged cells, frozen panes, multiple sheets.
 *   Explicitly OUT OF SCOPE / lossy: conditional formatting, charts, pivot tables, images,
 *   data validation, named ranges. If this proves too limiting in real usage, evaluate
 *   @univerjs/preset-sheets-advanced's own import/export plugin before extending this by hand.
 */
const jszip = require('jszip'); // exceljs's own dependency; declared directly since we use it too

let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (e) {
  ExcelJS = null;
  console.warn('exceljs not installed - .xlsx import/export will be unavailable');
}

const MAX_ROWS_PER_SHEET = 20000;
const MAX_COLS_PER_SHEET = 500;
const MAX_SHEETS = 50;
const MAX_TOTAL_CELLS = 500000; // backstops sheetContentStorage's 30MB S3 cap

const MACRO_CONTENT_TYPES = [
  'application/vnd.ms-excel.sheet.macroEnabled.main+xml',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.main',
  'application/vnd.ms-excel.template.macroEnabled.main+xml',
];

// --- formula sanitization (hardening #6): only propagate formulas that don't reach outside the sheet ---
const UNSAFE_FORMULA_PATTERNS = [
  /^=?\s*cmd\s*\|/i, // DDE: =cmd|'/c calc'!A1
  /^=?\s*DDE\s*\(/i, // explicit DDE(...) calls
  /\[[^\]]+\.xl[a-z]{2,4}\]/i, // external workbook reference: ['[Book2.xlsx]Sheet1'!A1]
  /\bWEBSERVICE\s*\(/i,
  /\bHYPERLINK\s*\(\s*["'](?!https?:|mailto:)/i, // HYPERLINK to a non-http(s)/mailto target
];

function supportsXlsx() {
  return Boolean(ExcelJS);
}

/**
 * @returns {{ formula: string|null, blocked: boolean }} formula is null when the input didn't
 * parse as a benign formula — the caller must fall back to writing a literal text value, never
 * silently drop the cell.
 */
function sanitizeFormula(rawFormula) {
  if (!rawFormula || typeof rawFormula !== 'string') return { formula: null, blocked: false };
  const isUnsafe = UNSAFE_FORMULA_PATTERNS.some((re) => re.test(rawFormula));
  if (isUnsafe) return { formula: null, blocked: true };
  return { formula: rawFormula, blocked: false };
}

function throwSizeError(message) {
  const err = new Error(message);
  err.code = 'WORKBOOK_TOO_LARGE';
  throw err;
}

/** Enforces hardening #1/#5's cell/row/sheet caps on a workbook JSON, before it's persisted or exported. */
function assertWithinCaps(workbookData) {
  const sheets = workbookData?.sheets || {};
  const sheetIds = Object.keys(sheets);
  if (sheetIds.length > MAX_SHEETS) {
    throwSizeError(`Workbook has too many sheets (max ${MAX_SHEETS})`);
  }
  let totalCells = 0;
  for (const sheetId of sheetIds) {
    const sheet = sheets[sheetId] || {};
    const cellData = sheet.cellData || {};
    const rowKeys = Object.keys(cellData);
    if (rowKeys.length > MAX_ROWS_PER_SHEET) {
      throwSizeError(`Sheet "${sheet.name || sheetId}" has too many rows (max ${MAX_ROWS_PER_SHEET})`);
    }
    for (const rowKey of rowKeys) {
      const colKeys = Object.keys(cellData[rowKey] || {});
      if (colKeys.length > MAX_COLS_PER_SHEET) {
        throwSizeError(`Sheet "${sheet.name || sheetId}" has too many columns (max ${MAX_COLS_PER_SHEET})`);
      }
      totalCells += colKeys.length;
    }
  }
  if (totalCells > MAX_TOTAL_CELLS) {
    throwSizeError(`Workbook has too many populated cells (max ${MAX_TOTAL_CELLS})`);
  }
}

/** Peeks at the raw zip's [Content_Types].xml for macro-enabled parts — never trust the client-supplied extension/MIME. */
async function assertNotMacroEnabled(buffer) {
  let zip;
  try {
    zip = await jszip.loadAsync(buffer);
  } catch (e) {
    return; // not a valid zip at all — the ExcelJS parse step will produce the "invalid file" error
  }
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (!contentTypesFile) return;
  const xml = await contentTypesFile.async('string');
  const isMacroEnabled = MACRO_CONTENT_TYPES.some((ct) => xml.includes(ct));
  if (isMacroEnabled) {
    const err = new Error('Macro-enabled Excel files (.xlsm) are not supported, even if renamed to .xlsx');
    err.code = 'MACRO_ENABLED_NOT_ALLOWED';
    throw err;
  }
}

function rgbToArgb(rgb) {
  if (!rgb) return null;
  const hex = String(rgb).replace('#', '').toUpperCase();
  if (hex.length === 6) return `FF${hex}`;
  if (hex.length === 8) return hex;
  return null;
}

function argbToRgb(argb) {
  if (!argb || argb.length < 6) return null;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  return `#${hex}`;
}

/** Univer IStyleData -> ExcelJS per-cell style properties (best-effort, see file header). */
function univerStyleToExcelStyle(styleData) {
  if (!styleData || typeof styleData !== 'object') return {};
  const result = {};
  const font = {};
  if (styleData.bl === 1) font.bold = true;
  if (styleData.it === 1) font.italic = true;
  if (styleData.ff) font.name = styleData.ff;
  if (styleData.fs) font.size = styleData.fs;
  const fontArgb = rgbToArgb(styleData.cl?.rgb);
  if (fontArgb) font.color = { argb: fontArgb };
  if (Object.keys(font).length) result.font = font;

  const fillArgb = rgbToArgb(styleData.bg?.rgb);
  if (fillArgb) result.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };

  if (styleData.n?.pattern) result.numFmt = styleData.n.pattern;

  if (styleData.bd) {
    const mapSide = (side) => {
      if (!side) return undefined;
      const argb = rgbToArgb(side.cl?.rgb) || 'FF000000';
      return { style: 'thin', color: { argb } };
    };
    const border = {
      top: mapSide(styleData.bd.t),
      bottom: mapSide(styleData.bd.b),
      left: mapSide(styleData.bd.l),
      right: mapSide(styleData.bd.r),
    };
    if (Object.values(border).some(Boolean)) result.border = border;
  }
  return result;
}

/** ExcelJS cell (font/fill/numFmt/border) -> Univer IStyleData (best-effort, see file header). */
function excelStyleToUniverStyle(cell) {
  const style = {};
  const font = cell.font;
  if (font) {
    if (font.bold) style.bl = 1;
    if (font.italic) style.it = 1;
    if (font.name) style.ff = font.name;
    if (font.size) style.fs = font.size;
    const rgb = argbToRgb(font.color?.argb);
    if (rgb) style.cl = { rgb };
  }
  const fill = cell.fill;
  if (fill && fill.type === 'pattern' && fill.fgColor?.argb) {
    const rgb = argbToRgb(fill.fgColor.argb);
    if (rgb) style.bg = { rgb };
  }
  if (cell.numFmt) style.n = { pattern: cell.numFmt };
  const border = cell.border;
  if (border) {
    // BorderStyleTypes.THIN = 1 in @univerjs/core — hardcoded to avoid a backend runtime
    // dependency on the (frontend-only) @univerjs/core package for one constant.
    const mapSide = (side) => (side ? { s: 1, cl: { rgb: argbToRgb(side.color?.argb) || '#000000' } } : undefined);
    const bd = {
      t: mapSide(border.top),
      b: mapSide(border.bottom),
      l: mapSide(border.left),
      r: mapSide(border.right),
    };
    if (Object.values(bd).some(Boolean)) style.bd = bd;
  }
  return Object.keys(style).length ? style : undefined;
}

function excelColumnToIndex(col) {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result - 1; // 0-indexed
}

/** Parses an ExcelJS merge range string ("A1:B2") into Univer's IRange shape (endRow/endColumn exclusive). */
function parseExcelMergeRange(rangeStr) {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(rangeStr || '');
  if (!match) return null;
  const [, colStart, rowStart, colEnd, rowEnd] = match;
  return {
    startRow: Number(rowStart) - 1,
    endRow: Number(rowEnd),
    startColumn: excelColumnToIndex(colStart),
    endColumn: excelColumnToIndex(colEnd) + 1,
  };
}

/**
 * @param {object} workbookData Univer IWorkbookData
 * @returns {Promise<Buffer>}
 */
async function workbookDataToXlsxBuffer(workbookData) {
  if (!ExcelJS) {
    const err = new Error('Excel export is not available on this server');
    err.code = 'XLSX_UNAVAILABLE';
    throw err;
  }
  assertWithinCaps(workbookData);

  const workbook = new ExcelJS.Workbook();
  const sheetOrder = workbookData.sheetOrder || Object.keys(workbookData.sheets || {});

  for (const sheetId of sheetOrder) {
    const sheetData = workbookData.sheets?.[sheetId];
    if (!sheetData) continue;
    const worksheet = workbook.addWorksheet(sheetData.name || 'Sheet');

    const cellData = sheetData.cellData || {};
    for (const rowKey of Object.keys(cellData)) {
      const rowIndex = Number(rowKey);
      const row = cellData[rowKey] || {};
      for (const colKey of Object.keys(row)) {
        const colIndex = Number(colKey);
        const cell = row[colKey];
        if (!cell) continue;
        const excelCell = worksheet.getCell(rowIndex + 1, colIndex + 1);

        if (cell.f) {
          const { formula, blocked } = sanitizeFormula(cell.f);
          if (formula) {
            const result = ['string', 'number', 'boolean'].includes(typeof cell.v) ? cell.v : undefined;
            excelCell.value = { formula: formula.replace(/^=/, ''), result };
          } else if (blocked) {
            // Unsafe formula — persist the last computed value as plain text, never the live formula
            excelCell.value = cell.v != null ? String(cell.v) : null;
          }
        } else if (cell.v !== undefined && cell.v !== null) {
          excelCell.value = cell.v;
        }

        const style = univerStyleToExcelStyle(typeof cell.s === 'object' ? cell.s : null);
        if (style.font) excelCell.font = style.font;
        if (style.fill) excelCell.fill = style.fill;
        if (style.numFmt) excelCell.numFmt = style.numFmt;
        if (style.border) excelCell.border = style.border;
      }
    }

    (sheetData.mergeData || []).forEach((range) => {
      try {
        worksheet.mergeCells(range.startRow + 1, range.startColumn + 1, range.endRow, range.endColumn);
      } catch (e) {
        // skip malformed/overlapping merge ranges rather than failing the whole export
      }
    });

    // Univer stores column width in pixels; ExcelJS uses ~character units (7px/char is the standard approximation).
    const columnData = sheetData.columnData || {};
    Object.keys(columnData).forEach((colKey) => {
      const col = columnData[colKey];
      if (col?.w) worksheet.getColumn(Number(colKey) + 1).width = Math.max(4, Math.round(col.w / 7));
    });

    // Univer stores row height in pixels; ExcelJS uses points (96dpi: 1pt = 4/3px).
    const rowData = sheetData.rowData || {};
    Object.keys(rowData).forEach((rowKey) => {
      const rd = rowData[rowKey];
      if (rd?.h) worksheet.getRow(Number(rowKey) + 1).height = Math.round(rd.h * 0.75);
    });

    if (sheetData.freeze && (sheetData.freeze.xSplit > 0 || sheetData.freeze.ySplit > 0)) {
      worksheet.views = [{ state: 'frozen', xSplit: sheetData.freeze.xSplit || 0, ySplit: sheetData.freeze.ySplit || 0 }];
    }
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet('Sheet1');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * @param {Buffer} buffer raw .xlsx file bytes
 * @returns {Promise<object>} Univer IWorkbookData
 */
async function xlsxBufferToWorkbookData(buffer) {
  if (!ExcelJS) {
    const err = new Error('Excel import is not available on this server');
    err.code = 'XLSX_UNAVAILABLE';
    throw err;
  }

  await assertNotMacroEnabled(buffer);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (e) {
    const err = new Error('Invalid or corrupted Excel file');
    err.code = 'INVALID_XLSX';
    err.cause = e;
    throw err;
  }

  if (workbook.worksheets.length > MAX_SHEETS) {
    throwSizeError(`Workbook has too many sheets (max ${MAX_SHEETS})`);
  }

  const sheets = {};
  const sheetOrder = [];

  workbook.worksheets.forEach((worksheet, sheetIndex) => {
    const sheetId = `sheet-${sheetIndex}-${Date.now().toString(36)}`;
    sheetOrder.push(sheetId);
    const cellData = {};
    let maxRow = 0;
    let maxCol = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const rowIndex = rowNumber - 1;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // Non-top-left cells of a merged range carry a Merge placeholder whose .text/.value
        // access can throw (ExcelJS internal) — the master (top-left) cell already has the
        // real value, and Univer's mergeData range is what makes the merge visible either way.
        if (cell.type === ExcelJS.ValueType.Merge) return;

        const colIndex = colNumber - 1;
        maxRow = Math.max(maxRow, rowIndex);
        maxCol = Math.max(maxCol, colIndex);

        const univerCell = {};
        if (cell.formula) {
          const { formula, blocked } = sanitizeFormula(`=${cell.formula}`);
          if (formula) {
            univerCell.f = formula;
            if (['string', 'number', 'boolean'].includes(typeof cell.result)) {
              univerCell.v = cell.result;
            }
          } else if (blocked) {
            univerCell.v = cell.result != null ? String(cell.result) : '';
          }
        } else if (cell.value instanceof Date) {
          univerCell.v = cell.value.toISOString();
        } else if (cell.value !== null && cell.value !== undefined && typeof cell.value !== 'object') {
          univerCell.v = cell.value;
        } else if (cell.text) {
          univerCell.v = cell.text;
        }

        const style = excelStyleToUniverStyle(cell);
        if (style) univerCell.s = style;

        if (Object.keys(univerCell).length > 0) {
          if (!cellData[rowIndex]) cellData[rowIndex] = {};
          cellData[rowIndex][colIndex] = univerCell;
        }
      });
    });

    const rowCount = Object.keys(cellData).length;
    if (rowCount > MAX_ROWS_PER_SHEET) {
      throwSizeError(`Sheet "${worksheet.name}" has too many rows (max ${MAX_ROWS_PER_SHEET})`);
    }
    for (const rowKey of Object.keys(cellData)) {
      const colCount = Object.keys(cellData[rowKey]).length;
      if (colCount > MAX_COLS_PER_SHEET) {
        throwSizeError(`Sheet "${worksheet.name}" has too many columns (max ${MAX_COLS_PER_SHEET})`);
      }
    }

    const mergeData = (worksheet.model?.merges || [])
      .map(parseExcelMergeRange)
      .filter(Boolean);

    sheets[sheetId] = {
      id: sheetId,
      name: worksheet.name || `Sheet${sheetIndex + 1}`,
      rowCount: Math.max(maxRow + 1, 100),
      columnCount: Math.max(maxCol + 1, 26),
      cellData,
      mergeData,
    };
  });

  const workbookData = {
    id: `wb-${Date.now().toString(36)}`,
    name: 'Imported Workbook',
    appVersion: '0.25.1',
    locale: 'enUS', // LocaleType.EN_US
    styles: {},
    sheetOrder,
    sheets,
  };

  assertWithinCaps(workbookData);
  return workbookData;
}

module.exports = {
  supportsXlsx,
  sanitizeFormula,
  assertWithinCaps,
  assertNotMacroEnabled,
  workbookDataToXlsxBuffer,
  xlsxBufferToWorkbookData,
  MAX_ROWS_PER_SHEET,
  MAX_COLS_PER_SHEET,
  MAX_SHEETS,
  MAX_TOTAL_CELLS,
};
