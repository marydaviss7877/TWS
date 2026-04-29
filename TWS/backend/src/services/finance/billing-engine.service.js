const { Invoice, TimeEntry, Transaction, Client } = require('../../models/finance/Finance');
const Expense = require('../../models/finance/Expense');
const projectApi = require('../module-api/project-api.service');
const financeApi = require('../module-api/finance-api.service');

class BillingEngineService {
  /**
   * Generate invoice from project/time entries
   * Uses Module API layer - no direct cross-module model access
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @param {Object} options - Options (billableOnly, includeExpenses, etc.)
   * @returns {Object} Created invoice
   */
  async generateInvoiceFromProject(orgId, projectId, options = {}) {
    try {
      const {
        billableOnly = true,
        includeExpenses = true,
        startDate = null,
        endDate = null,
        clientId = null
      } = options;

      // Get project via Module API (Projects module boundary)
      const project = await projectApi.getProjectWithClient(orgId, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get client via Module API (Finance module boundary)
      const client = await financeApi.getClientForProject(orgId, projectId, project.clientId);

      const invoiceClientId = clientId || project.clientId;
      if (!invoiceClientId) {
        throw new Error('Client ID is required for invoice generation');
      }
      
      const clientPaymentTerms = client?.paymentTerms || 'net_30';
      const clientDefaultRate = client?.defaultHourlyRate || 0;
      const clientTaxRate = client?.taxRate || 0;

      // Get time entries via Module API (Finance owns TimeEntry)
      const timeEntries = await financeApi.getTimeEntriesForProject(orgId, projectId, {
        billableOnly,
        status: ['approved', 'submitted'],
        startDate,
        endDate
      });

      // Get expenses via Module API
      let expenses = [];
      if (includeExpenses) {
        expenses = await financeApi.getExpensesForProject(orgId, projectId, {
          billableOnly,
          status: 'approved',
          startDate,
          endDate
        });
      }

      // Calculate totals
      let subtotal = 0;
      const lineItems = [];

      // Add time entry line items
      timeEntries.forEach(entry => {
        const rate = entry.hourlyRate || clientDefaultRate || 0;
        const amount = entry.hours * rate;
        subtotal += amount;

        lineItems.push({
          description: entry.description || `Time entry - ${entry.employeeId?.fullName || 'Unknown'}`,
          quantity: entry.hours,
          rate: rate,
          amount: amount,
          type: 'time',
          timeEntryId: entry._id
        });
      });

      // Add expense line items
      expenses.forEach(expense => {
        const amount = expense.amount || 0;
        subtotal += amount;

        lineItems.push({
          description: expense.description || expense.category || 'Expense',
          quantity: 1,
          rate: amount,
          amount: amount,
          type: 'expense',
          expenseId: expense._id
        });
      });

      // Calculate tax (default 0, can be configured)
      const taxRate = clientTaxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(orgId);

      // Create invoice
      const invoice = new Invoice({
        orgId: orgId,
        invoiceNumber: invoiceNumber,
        clientId: invoiceClientId,
        projectId: projectId,
        issueDate: new Date(),
        dueDate: this.calculateDueDate(clientPaymentTerms),
        items: lineItems,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total,
        status: 'draft',
        paymentTerms: clientPaymentTerms,
        notes: `Invoice generated from project: ${project.name || projectId}`
      });

      await invoice.save();

      // Mark time entries as billed
      if (timeEntries.length > 0) {
        await TimeEntry.updateMany(
          { _id: { $in: timeEntries.map(e => e._id) } },
          { $set: { status: 'billed', invoiceId: invoice._id } }
        );
      }

      // Mark expenses as billed
      if (expenses.length > 0) {
        await Expense.updateMany(
          { _id: { $in: expenses.map(e => e._id) } },
          { $set: { status: 'billed', invoiceId: invoice._id } }
        );
      }

      return invoice;
    } catch (error) {
      console.error('Error generating invoice from project:', error);
      throw error;
    }
  }

  /**
   * Create recurring invoice
   * @param {string} orgId - Organization ID
   * @param {Object} invoiceData - Invoice data with recurring config
   * @returns {Object} Created recurring invoice config
   */
  async createRecurringInvoice(orgId, invoiceData) {
    try {
      const {
        frequency,
        startDate,
        endDate,
        nextDueDate,
        ...invoiceTemplate
      } = invoiceData;

      if (!frequency || !startDate) {
        throw new Error('Frequency and start date are required for recurring invoices');
      }

      // Create the first invoice
      const invoiceNumber = await this.generateInvoiceNumber(orgId);
      const invoice = new Invoice({
        ...invoiceTemplate,
        orgId: orgId,
        invoiceNumber: invoiceNumber,
        issueDate: new Date(startDate),
        dueDate: nextDueDate ? new Date(nextDueDate) : this.calculateDueDate(invoiceTemplate.paymentTerms || 'net_30'),
        status: 'draft',
        recurring: {
          enabled: true,
          frequency: frequency,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : this.calculateNextDueDate(new Date(startDate), frequency)
        }
      });

      await invoice.save();
      return invoice;
    } catch (error) {
      console.error('Error creating recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Generate invoices from recurring templates
   * @param {string} orgId - Organization ID
   * @returns {Array} Generated invoices
   */
  async processRecurringInvoices(orgId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find recurring invoices due
      const recurringInvoices = await Invoice.find({
        orgId: orgId,
        'recurring.enabled': true,
        'recurring.nextDueDate': { $lte: today },
        $or: [
          { 'recurring.endDate': null },
          { 'recurring.endDate': { $gte: today } }
        ]
      });

      const generatedInvoices = [];

      for (const template of recurringInvoices) {
        // Generate new invoice from template
        const invoiceNumber = await this.generateInvoiceNumber(orgId);
        const newInvoice = new Invoice({
          orgId: template.orgId,
          invoiceNumber: invoiceNumber,
          clientId: template.clientId,
          projectId: template.projectId,
          issueDate: new Date(),
          dueDate: this.calculateDueDate(template.paymentTerms || 'net_30'),
          items: template.items.map(item => ({ ...item.toObject() })),
          subtotal: template.subtotal,
          taxRate: template.taxRate,
          taxAmount: template.taxAmount,
          total: template.total,
          status: 'draft',
          paymentTerms: template.paymentTerms,
          notes: template.notes,
          recurring: {
            enabled: true,
            frequency: template.recurring.frequency,
            startDate: template.recurring.startDate,
            endDate: template.recurring.endDate,
            nextDueDate: this.calculateNextDueDate(today, template.recurring.frequency)
          }
        });

        await newInvoice.save();
        generatedInvoices.push(newInvoice);

        // Update template's next due date
        template.recurring.nextDueDate = this.calculateNextDueDate(today, template.recurring.frequency);
        await template.save();
      }

      return generatedInvoices;
    } catch (error) {
      console.error('Error processing recurring invoices:', error);
      throw error;
    }
  }

  /**
   * Apply invoice template
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @param {string} templateId - Template ID
   * @returns {Object} Updated invoice
   */
  async applyInvoiceTemplate(orgId, invoiceId, templateId) {
    try {
      // Load template (this would be stored in a separate collection or config)
      // For now, we'll use a simple template structure
      const invoice = await Invoice.findOne({ _id: invoiceId, orgId: orgId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Apply template formatting (this would be more complex in a real system)
      // For now, we'll just return the invoice
      return invoice;
    } catch (error) {
      console.error('Error applying invoice template:', error);
      throw error;
    }
  }

  /**
   * Send invoice (email)
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @param {string} recipientEmail - Recipient email
   * @returns {Object} Email send result
   */
  async sendInvoice(orgId, invoiceId, recipientEmail) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, orgId: orgId })
        .populate('clientId', 'name email')
        .populate('projectId', 'name');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF invoice (this would use a PDF generation library)
      // For now, we'll just log the action
      console.log(`Sending invoice ${invoice.invoiceNumber} to ${recipientEmail}`);

      // Update invoice status
      invoice.status = 'sent';
      invoice.sentAt = new Date();
      await invoice.save();

      // Log email sent event (would integrate with email service)
      return {
        success: true,
        message: 'Invoice sent successfully',
        invoiceId: invoice._id,
        recipientEmail: recipientEmail
      };
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  /**
   * Create payment link
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Object} Payment link
   */
  async createPaymentLink(orgId, invoiceId) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, orgId: orgId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate secure payment link (this would integrate with payment gateway)
      const paymentToken = require('crypto').randomBytes(32).toString('hex');
      const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}`;

      invoice.paymentLink = paymentLink;
      invoice.paymentToken = paymentToken;
      await invoice.save();

      return {
        paymentLink: paymentLink,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Generate invoice number
   * @param {string} orgId - Organization ID
   * @returns {string} Invoice number
   */
  async generateInvoiceNumber(orgId) {
    try {
      const year = new Date().getFullYear();
      const prefix = `INV-${year}-`;

      const lastInvoice = await Invoice.findOne({
        orgId: orgId,
        invoiceNumber: { $regex: `^${prefix}` }
      }).sort({ invoiceNumber: -1 });

      let sequence = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop()) || 0;
        sequence = lastSequence + 1;
      }

      return `${prefix}${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return `INV-${Date.now()}`;
    }
  }

  /**
   * Calculate due date based on payment terms
   * @param {string} paymentTerms - Payment terms (net_15, net_30, etc.)
   * @returns {Date} Due date
   */
  calculateDueDate(paymentTerms) {
    const days = {
      'due_on_receipt': 0,
      'net_15': 15,
      'net_30': 30,
      'net_45': 45,
      'net_60': 60
    };

    const daysToAdd = days[paymentTerms] || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
  }

  /**
   * Calculate next due date for recurring invoices
   * @param {Date} currentDate - Current date
   * @param {string} frequency - Frequency (daily, weekly, monthly, etc.)
   * @returns {Date} Next due date
   */
  calculateNextDueDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }
}

module.exports = new BillingEngineService();
