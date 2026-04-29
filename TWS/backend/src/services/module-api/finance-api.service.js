/**
 * Finance Module API
 * 
 * Single source of truth for finance data access across modules.
 * Other modules MUST use this API instead of directly requiring Finance models.
 * 
 * Module Boundary: Finance module owns Invoice, Bill, TimeEntry, Client, Transaction, etc.
 */

const { TimeEntry, Client, Invoice } = require('../../models/finance/Finance');
const Expense = require('../../models/finance/Expense');

class FinanceModuleAPI {
  /**
   * Get time entries for a project (for billing, costing)
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @param {Object} options - { billableOnly, status, startDate, endDate }
   * @returns {Array} Time entries
   */
  async getTimeEntriesForProject(orgId, projectId, options = {}) {
    const {
      billableOnly = false,
      status = ['approved', 'submitted'],
      startDate = null,
      endDate = null
    } = options;

    const filter = {
      orgId,
      projectId,
      status: { $in: Array.isArray(status) ? status : [status] }
    };

    if (billableOnly) filter.billable = true;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    return TimeEntry.find(filter)
      .populate('employeeId', 'fullName email')
      .sort({ date: 1 })
      .lean();
  }

  /**
   * Get client by ID (Finance Client model)
   * @param {string} orgId - Organization ID
   * @param {string} clientId - Client ID
   * @returns {Object|null} Client document
   */
  async getClientById(orgId, clientId) {
    return Client.findOne({ _id: clientId, orgId }).lean();
  }

  /**
   * Get client for project - resolves from Finance Client or ProjectClient
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @param {string} clientId - Client ID from project
   * @returns {Object|null} Client with billing info
   */
  async getClientForProject(orgId, projectId, clientId) {
    if (!clientId) return null;

    let client = await Client.findOne({ _id: clientId, orgId }).lean();
    if (client) return client;

    // Fallback: ProjectClient model (Projects module)
    try {
      const ProjectClient = require('../../models/ProjectClient');
      const projectClient = await ProjectClient.findOne({ _id: clientId, orgId }).lean();
      if (projectClient) {
        return {
          _id: projectClient._id,
          name: projectClient.name,
          email: projectClient.contact?.primary?.email,
          paymentTerms: projectClient.billing?.paymentTerms || 'net_30',
          defaultHourlyRate: projectClient.billing?.defaultHourlyRate || 0,
          taxRate: projectClient.billing?.taxRate || 0
        };
      }
    } catch (e) {
      // ProjectClient may not exist in all ERP types
    }
    return null;
  }

  /**
   * Get expenses for project
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @param {Object} options - { billableOnly, status, startDate, endDate }
   * @returns {Array} Expenses
   */
  async getExpensesForProject(orgId, projectId, options = {}) {
    const {
      billableOnly = false,
      status = 'approved',
      startDate = null,
      endDate = null
    } = options;

    const filter = {
      organizationId: orgId,
      projectId,
      status
    };

    if (billableOnly) filter.billable = true;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    return Expense.find(filter).lean();
  }

  /**
   * Get invoice by ID
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Object|null}
   */
  async getInvoiceById(orgId, invoiceId) {
    return Invoice.findOne({ _id: invoiceId, orgId })
      .populate('clientId', 'name email')
      .lean();
  }
}

module.exports = new FinanceModuleAPI();
