const FinanceDashboardService = require('./financeDashboardService');

// Try to load optional dependencies
let ExcelJS, PDFDocument;
try {
  ExcelJS = require('exceljs');
} catch (e) {
  ExcelJS = null;
  console.warn('exceljs not installed - Excel export will be unavailable');
}

try {
  PDFDocument = require('pdfkit');
} catch (e) {
  PDFDocument = null;
  console.warn('pdfkit not installed - PDF export will be unavailable');
}

/**
 * Finance Export Service
 * Handles export of financial data to PDF, Excel, and CSV formats
 */
class FinanceExportService {
  static supportsExcel() {
    return Boolean(ExcelJS);
  }

  static supportsPdf() {
    return Boolean(PDFDocument);
  }

  /**
   * Export KPIs to Excel
   */
  static async exportKPIsToExcel(orgId, period = 'month', res) {
    if (!ExcelJS) {
      return res.status(501).json({
        success: false,
        message: 'Excel export not available - exceljs package not installed'
      });
    }

    try {
      const kpis = await FinanceDashboardService.calculateKPIs(orgId, period);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Financial KPIs');

      // Add header
      worksheet.addRow(['Financial KPIs', `Period: ${period}`]);
      worksheet.addRow([]);

      // Add KPI data
      const kpiData = [
        ['Metric', 'Value'],
        ['Total Revenue', kpis.totalRevenue],
        ['Total Revenue (MTD)', kpis.totalRevenueMTD],
        ['Total Revenue (YTD)', kpis.totalRevenueYTD],
        ['Total Revenue (YoY Growth)', `${kpis.totalRevenueYoY}%`],
        ['Net Profit', kpis.netProfit],
        ['Net Profit (MTD)', kpis.netProfitMTD],
        ['Net Profit (YTD)', kpis.netProfitYTD],
        ['Net Profit (YoY Growth)', `${kpis.netProfitYoY}%`],
        ['Gross Margin', `${kpis.grossMargin}%`],
        ['Operating Margin', `${kpis.operatingMargin}%`],
        ['EBITDA', kpis.ebitda],
        ['Cash on Hand', kpis.cashOnHand],
        ['Accounts Receivable', kpis.accountsReceivable],
        ['Accounts Payable', kpis.accountsPayable],
        ['Working Capital', kpis.workingCapital],
        ['Current Ratio', kpis.currentRatio],
        ['Quick Ratio', kpis.quickRatio],
        ['Outstanding Invoices', kpis.outstandingInvoices],
        ['Overdue Invoices', kpis.overdueInvoices],
        ['Pending Bills', kpis.pendingBills],
        ['Active Projects', kpis.activeProjects],
        ['Budget Variance', `${kpis.budgetVariance}%`],
        ['Expense Ratio', `${kpis.expenseRatio}%`],
        ['Revenue per Employee', kpis.revenuePerEmployee],
        ['Cost per Project', kpis.costPerProject]
      ];

      kpiData.forEach(row => worksheet.addRow(row));

      // Style header
      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(3).font = { bold: true };

      // Set column widths
      worksheet.getColumn(1).width = 30;
      worksheet.getColumn(2).width = 20;

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=financial-kpis-${period}-${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting KPIs to Excel:', error);
      throw error;
    }
  }

  /**
   * Export KPIs to PDF
   */
  static async exportKPIsToPDF(orgId, period = 'month', res) {
    if (!PDFDocument) {
      return res.status(501).json({
        success: false,
        message: 'PDF export not available - pdfkit package not installed'
      });
    }

    try {
      const kpis = await FinanceDashboardService.calculateKPIs(orgId, period);
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=financial-kpis-${period}-${Date.now()}.pdf`);

      doc.pipe(res);

      // Add title
      doc.fontSize(20).text('Financial KPIs Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, { align: 'center' });
      doc.moveDown(2);

      // Add KPI data
      doc.fontSize(14).text('Financial Metrics', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Total Revenue: $${kpis.totalRevenue.toLocaleString()}`);
      doc.text(`Net Profit: $${kpis.netProfit.toLocaleString()}`);
      doc.text(`Gross Margin: ${kpis.grossMargin}%`);
      doc.text(`Operating Margin: ${kpis.operatingMargin}%`);
      doc.moveDown();
      doc.text(`Cash on Hand: $${kpis.cashOnHand.toLocaleString()}`);
      doc.text(`Accounts Receivable: $${kpis.accountsReceivable.toLocaleString()}`);
      doc.text(`Accounts Payable: $${kpis.accountsPayable.toLocaleString()}`);
      doc.text(`Working Capital: $${kpis.workingCapital.toLocaleString()}`);
      doc.moveDown();
      doc.text(`Active Projects: ${kpis.activeProjects}`);
      doc.text(`Overdue Invoices: ${kpis.overdueInvoices}`);
      doc.text(`Pending Bills: ${kpis.pendingBills}`);

      doc.end();
    } catch (error) {
      console.error('Error exporting KPIs to PDF:', error);
      throw error;
    }
  }

  /**
   * Export KPIs to CSV
   */
  static async exportKPIsToCSV(orgId, period = 'month', res) {
    try {
      const kpis = await FinanceDashboardService.calculateKPIs(orgId, period);

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financial-kpis-${period}-${Date.now()}.csv`);

      // CSV header
      res.write('Metric,Value\n');
      res.write(`Total Revenue,${kpis.totalRevenue}\n`);
      res.write(`Total Revenue (MTD),${kpis.totalRevenueMTD}\n`);
      res.write(`Total Revenue (YTD),${kpis.totalRevenueYTD}\n`);
      res.write(`Total Revenue (YoY Growth),${kpis.totalRevenueYoY}%\n`);
      res.write(`Net Profit,${kpis.netProfit}\n`);
      res.write(`Net Profit (MTD),${kpis.netProfitMTD}\n`);
      res.write(`Net Profit (YTD),${kpis.netProfitYTD}\n`);
      res.write(`Net Profit (YoY Growth),${kpis.netProfitYoY}%\n`);
      res.write(`Gross Margin,${kpis.grossMargin}%\n`);
      res.write(`Operating Margin,${kpis.operatingMargin}%\n`);
      res.write(`EBITDA,${kpis.ebitda}\n`);
      res.write(`Cash on Hand,${kpis.cashOnHand}\n`);
      res.write(`Accounts Receivable,${kpis.accountsReceivable}\n`);
      res.write(`Accounts Payable,${kpis.accountsPayable}\n`);
      res.write(`Working Capital,${kpis.workingCapital}\n`);
      res.write(`Current Ratio,${kpis.currentRatio}\n`);
      res.write(`Quick Ratio,${kpis.quickRatio}\n`);
      res.write(`Outstanding Invoices,${kpis.outstandingInvoices}\n`);
      res.write(`Overdue Invoices,${kpis.overdueInvoices}\n`);
      res.write(`Pending Bills,${kpis.pendingBills}\n`);
      res.write(`Active Projects,${kpis.activeProjects}\n`);
      res.write(`Budget Variance,${kpis.budgetVariance}%\n`);
      res.write(`Expense Ratio,${kpis.expenseRatio}%\n`);
      res.write(`Revenue per Employee,${kpis.revenuePerEmployee}\n`);
      res.write(`Cost per Project,${kpis.costPerProject}\n`);

      res.end();
    } catch (error) {
      console.error('Error exporting KPIs to CSV:', error);
      throw error;
    }
  }

  /**
   * Export dashboard data to Excel
   */
  static async exportDashboardToExcel(orgId, period = 'month', res) {
    if (!ExcelJS) {
      return res.status(501).json({
        success: false,
        message: 'Excel export not available - exceljs package not installed'
      });
    }

    try {
      const [
        kpis,
        revenue,
        expenses,
        cashFlow,
        accountsAging,
        projectProfitability,
        budgetVsActual
      ] = await Promise.all([
        FinanceDashboardService.calculateKPIs(orgId, period),
        FinanceDashboardService.getRevenueTrends(orgId, period),
        FinanceDashboardService.getExpenseTrends(orgId, period),
        FinanceDashboardService.getCashFlow(orgId, period),
        FinanceDashboardService.getAccountsAging(orgId),
        FinanceDashboardService.getProjectProfitability(orgId),
        FinanceDashboardService.getBudgetVsActual(orgId, period)
      ]);

      const workbook = new ExcelJS.Workbook();

      // KPIs Sheet
      const kpisSheet = workbook.addWorksheet('KPIs');
      kpisSheet.addRow(['Financial KPIs', `Period: ${period}`]);
      kpisSheet.addRow(['Metric', 'Value']);
      kpisSheet.addRow(['Total Revenue', kpis.totalRevenue]);
      kpisSheet.addRow(['Net Profit', kpis.netProfit]);
      kpisSheet.addRow(['Cash on Hand', kpis.cashOnHand]);
      kpisSheet.addRow(['Accounts Receivable', kpis.accountsReceivable]);
      kpisSheet.addRow(['Accounts Payable', kpis.accountsPayable]);

      // Revenue Trends Sheet
      const revenueSheet = workbook.addWorksheet('Revenue Trends');
      revenueSheet.addRow(['Month', 'Amount', 'Target']);
      revenue.forEach(item => {
        revenueSheet.addRow([item.month, item.amount, item.target]);
      });

      // Cash Flow Sheet
      const cashFlowSheet = workbook.addWorksheet('Cash Flow');
      cashFlowSheet.addRow(['Month', 'Inflow', 'Outflow', 'Net']);
      cashFlow.forEach(item => {
        cashFlowSheet.addRow([item.month, item.inflow, item.outflow, item.net]);
      });

      // Project Profitability Sheet
      const projectsSheet = workbook.addWorksheet('Project Profitability');
      projectsSheet.addRow(['Project', 'Revenue', 'Cost', 'Profit', 'Margin']);
      projectProfitability.forEach(item => {
        projectsSheet.addRow([item.name, item.revenue, item.cost, item.profit, `${item.margin}%`]);
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=finance-dashboard-${period}-${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting dashboard to Excel:', error);
      throw error;
    }
  }
}

module.exports = FinanceExportService;

