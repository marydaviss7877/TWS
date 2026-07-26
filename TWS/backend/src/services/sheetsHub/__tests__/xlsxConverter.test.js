/**
 * Golden-file round-trip tests for xlsxConverter.service.js. A JSON<->binary converter is
 * exactly the kind of code that silently regresses without this — covers values, formulas,
 * styles, merges, multiple sheets, formula sanitization, and the size/macro rejection paths.
 */
const JSZip = require('jszip');
const converter = require('../xlsxConverter.service');

function buildWorkbookData(sheets, sheetOrder) {
  const order = sheetOrder || Object.keys(sheets);
  return {
    id: 'wb-test',
    name: 'Test Workbook',
    appVersion: '0.25.1',
    locale: 'enUS',
    styles: {},
    sheetOrder: order,
    sheets,
  };
}

describe('xlsxConverter.service', () => {
  describe('workbookDataToXlsxBuffer <-> xlsxBufferToWorkbookData round trip', () => {
    it('preserves cell values, a formula and its computed result', async () => {
      const workbookData = buildWorkbookData({
        s1: {
          id: 's1',
          name: 'Sheet1',
          rowCount: 10,
          columnCount: 10,
          cellData: {
            0: { 0: { v: 'Label' }, 1: { v: 42 } },
            1: { 0: { v: 10 }, 1: { v: 20 } },
            2: { 0: { v: 'Sum' }, 1: { v: 30, f: '=SUM(B2:B3)' } },
          },
          mergeData: [],
        },
      });

      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);

      const roundTripped = await converter.xlsxBufferToWorkbookData(buffer);
      const sheet = roundTripped.sheets[roundTripped.sheetOrder[0]];

      expect(sheet.cellData[0][0].v).toBe('Label');
      expect(sheet.cellData[0][1].v).toBe(42);
      expect(sheet.cellData[2][1].f).toBe('=SUM(B2:B3)');
      expect(sheet.cellData[2][1].v).toBe(30);
    });

    it('preserves basic cell styles (bold, fill color)', async () => {
      const workbookData = buildWorkbookData({
        s1: {
          id: 's1',
          name: 'Sheet1',
          rowCount: 5,
          columnCount: 5,
          cellData: {
            0: { 0: { v: 'Styled', s: { bl: 1, bg: { rgb: '#FFFF00' } } } },
          },
          mergeData: [],
        },
      });

      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      const roundTripped = await converter.xlsxBufferToWorkbookData(buffer);
      const sheet = roundTripped.sheets[roundTripped.sheetOrder[0]];

      expect(sheet.cellData[0][0].s.bl).toBe(1);
      expect(sheet.cellData[0][0].s.bg.rgb.toUpperCase()).toBe('#FFFF00');
    });

    it('preserves merged cell ranges', async () => {
      const workbookData = buildWorkbookData({
        s1: {
          id: 's1',
          name: 'Sheet1',
          rowCount: 5,
          columnCount: 5,
          cellData: { 0: { 2: { v: 'Merged' } } },
          mergeData: [{ startRow: 0, endRow: 2, startColumn: 2, endColumn: 4 }],
        },
      });

      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      const roundTripped = await converter.xlsxBufferToWorkbookData(buffer);
      const sheet = roundTripped.sheets[roundTripped.sheetOrder[0]];

      expect(sheet.mergeData).toEqual([{ startRow: 0, endRow: 2, startColumn: 2, endColumn: 4 }]);
    });

    it('preserves multiple sheets and their order', async () => {
      const workbookData = buildWorkbookData(
        {
          a: { id: 'a', name: 'Alpha', rowCount: 5, columnCount: 5, cellData: { 0: { 0: { v: 'A1' } } }, mergeData: [] },
          b: { id: 'b', name: 'Beta', rowCount: 5, columnCount: 5, cellData: { 0: { 0: { v: 'B1' } } }, mergeData: [] },
        },
        ['a', 'b']
      );

      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      const roundTripped = await converter.xlsxBufferToWorkbookData(buffer);
      const names = roundTripped.sheetOrder.map((id) => roundTripped.sheets[id].name);

      expect(names).toEqual(['Alpha', 'Beta']);
    });
  });

  describe('formula sanitization (hardening #6)', () => {
    it('flags DDE and external-reference formulas as unsafe', () => {
      expect(converter.sanitizeFormula('=cmd|/c calc!A1').blocked).toBe(true);
      expect(converter.sanitizeFormula('=DDE("cmd","/c calc","A1")').blocked).toBe(true);
      expect(converter.sanitizeFormula("='[Book2.xlsx]Sheet1'!A1").blocked).toBe(true);
      expect(converter.sanitizeFormula('=WEBSERVICE("http://evil.example/x")').blocked).toBe(true);
      expect(converter.sanitizeFormula('=HYPERLINK("javascript:alert(1)")').blocked).toBe(true);
    });

    it('allows ordinary formulas through unchanged', () => {
      const result = converter.sanitizeFormula('=SUM(A1:A10)');
      expect(result.blocked).toBe(false);
      expect(result.formula).toBe('=SUM(A1:A10)');
    });

    it('degrades an unsafe formula to its literal computed value on export, never a live formula', async () => {
      const workbookData = buildWorkbookData({
        s1: {
          id: 's1',
          name: 'Sheet1',
          rowCount: 5,
          columnCount: 5,
          cellData: { 0: { 0: { v: 'DANGER', f: '=cmd|/c calc!A1' } } },
          mergeData: [],
        },
      });

      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      const roundTripped = await converter.xlsxBufferToWorkbookData(buffer);
      const cell = roundTripped.sheets[roundTripped.sheetOrder[0]].cellData[0][0];

      expect(cell.f).toBeUndefined();
      expect(cell.v).toBe('DANGER');
    });
  });

  describe('size caps (hardening #1/#5)', () => {
    it('rejects a workbook with too many rows in a sheet', async () => {
      const cellData = {};
      for (let r = 0; r <= converter.MAX_ROWS_PER_SHEET; r++) cellData[r] = { 0: { v: r } };
      const workbookData = buildWorkbookData({
        s1: { id: 's1', name: 'Big', rowCount: 1, columnCount: 1, cellData, mergeData: [] },
      });

      await expect(converter.workbookDataToXlsxBuffer(workbookData)).rejects.toMatchObject({
        code: 'WORKBOOK_TOO_LARGE',
      });
    });

    it('rejects a workbook with too many sheets', async () => {
      const sheets = {};
      const sheetOrder = [];
      for (let i = 0; i <= converter.MAX_SHEETS; i++) {
        const id = `sheet-${i}`;
        sheets[id] = { id, name: `Sheet ${i}`, rowCount: 1, columnCount: 1, cellData: {}, mergeData: [] };
        sheetOrder.push(id);
      }
      const workbookData = buildWorkbookData(sheets, sheetOrder);

      expect(() => converter.assertWithinCaps(workbookData)).toThrow(
        expect.objectContaining({ code: 'WORKBOOK_TOO_LARGE' })
      );
    });
  });

  describe('macro-enabled file detection (hardening #5c)', () => {
    it('rejects a file whose Content_Types.xml declares a macro-enabled part, regardless of extension', async () => {
      const zip = new JSZip();
      zip.file(
        '[Content_Types].xml',
        '<?xml version="1.0"?><Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/></Types>'
      );
      const macroBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      await expect(converter.xlsxBufferToWorkbookData(macroBuffer)).rejects.toMatchObject({
        code: 'MACRO_ENABLED_NOT_ALLOWED',
      });
    });

    it('does not flag a normal generated workbook as macro-enabled', async () => {
      const workbookData = buildWorkbookData({
        s1: { id: 's1', name: 'Sheet1', rowCount: 5, columnCount: 5, cellData: { 0: { 0: { v: 'hi' } } }, mergeData: [] },
      });
      const buffer = await converter.workbookDataToXlsxBuffer(workbookData);
      await expect(converter.assertNotMacroEnabled(buffer)).resolves.toBeUndefined();
    });
  });

  describe('invalid input handling', () => {
    it('rejects a garbage buffer with a generic, non-leaking error', async () => {
      await expect(converter.xlsxBufferToWorkbookData(Buffer.from('not a real xlsx file'))).rejects.toMatchObject({
        code: 'INVALID_XLSX',
      });
    });
  });
});
