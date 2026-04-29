const { Invoice, Client, JournalEntry, ChartOfAccounts } = require('../../models/finance/Finance');

class AccountsReceivableService {
  /**
   * Get aging report
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Aging report
   */
  async getAgingReport(orgId, filters = {}) {
    try {
      const { clientId, startDate, endDate } = filters;
      
      const query = {
        orgId: orgId,
        status: { $in: ['sent', 'partial', 'overdue'] }
      };

      if (clientId) query.clientId = clientId;
      if (startDate || endDate) {
        query.issueDate = {};
        if (startDate) query.issueDate.$gte = new Date(startDate);
        if (endDate) query.issueDate.$lte = new Date(endDate);
      }

      const invoices = await Invoice.find(query)
        .populate('clientId', 'name email')
        .sort({ dueDate: 1 });

      const today = new Date();
      const agingBuckets = {
        '0-30': [],
        '31-60': [],
        '61-90': [],
        '90+': []
      };

      const totals = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
        total: 0
      };

      invoices.forEach(invoice => {
        const daysPastDue = Math.floor((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
        const outstandingAmount = invoice.total - (invoice.paidAmount || 0);

        if (outstandingAmount <= 0) return;

        let bucket;
        if (daysPastDue <= 30) {
          bucket = '0-30';
        } else if (daysPastDue <= 60) {
          bucket = '31-60';
        } else if (daysPastDue <= 90) {
          bucket = '61-90';
        } else {
          bucket = '90+';
        }

        agingBuckets[bucket].push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientId: invoice.clientId?._id,
          clientName: invoice.clientId?.name || 'Unknown',
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total,
          paidAmount: invoice.paidAmount || 0,
          outstandingAmount: outstandingAmount,
          daysPastDue: daysPastDue,
          status: invoice.status
        });

        totals[bucket] += outstandingAmount;
        totals.total += outstandingAmount;
      });

      return {
        agingBuckets: agingBuckets,
        totals: totals,
        summary: {
          totalInvoices: invoices.length,
          totalOutstanding: totals.total,
          averageDaysPastDue: this.calculateAverageDaysPastDue(agingBuckets),
          oldestInvoice: this.findOldestInvoice(agingBuckets)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting aging report:', error);
      throw error;
    }
  }

  /**
   * Send payment reminder
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Object} Reminder result
   */
  async sendPaymentReminder(orgId, invoiceId) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, orgId: orgId })
        .populate('clientId', 'name email contactPerson');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const outstandingAmount = invoice.total - (invoice.paidAmount || 0);
      if (outstandingAmount <= 0) {
        throw new Error('Invoice is already paid in full');
      }

      // Update reminder tracking
      if (!invoice.reminders) {
        invoice.reminders = [];
      }

      const reminder = {
        sentAt: new Date(),
        amount: outstandingAmount,
        daysPastDue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
      };

      invoice.reminders.push(reminder);
      invoice.lastReminderSentAt = new Date();
      await invoice.save();

      // Log reminder sent event (would integrate with email service)
      console.log(`Payment reminder sent for invoice ${invoice.invoiceNumber} to ${invoice.clientId?.email}`);

      return {
        success: true,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientEmail: invoice.clientId?.email,
        outstandingAmount: outstandingAmount,
        reminder: reminder
      };
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      throw error;
    }
  }

  /**
   * Record payment
   * @param {string} orgId - Organization ID
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment record
   */
  async recordPayment(orgId, invoiceId, paymentData) {
    try {
      const { amount, paymentDate, paymentMethod, reference, notes } = paymentData;

      const invoice = await Invoice.findOne({ _id: invoiceId, orgId: orgId })
        .populate('clientId', 'name');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const outstandingAmount = invoice.total - (invoice.paidAmount || 0);
      
      if (amount > outstandingAmount) {
        throw new Error(`Payment amount (${amount}) exceeds outstanding amount (${outstandingAmount})`);
      }

      // Create payment record
      if (!invoice.payments) {
        invoice.payments = [];
      }

      const payment = {
        amount: amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        reference: reference,
        notes: notes,
        recordedAt: new Date()
      };

      invoice.payments.push(payment);
      invoice.paidAmount = (invoice.paidAmount || 0) + amount;

      // Update invoice status
      if (invoice.paidAmount >= invoice.total) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partial';
      }

      await invoice.save();

      // Update chart of accounts (cash/debit, AR/credit)
      await this.updateChartOfAccounts(orgId, invoice, amount, payment);

      return {
        success: true,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        payment: payment,
        newPaidAmount: invoice.paidAmount,
        outstandingAmount: invoice.total - invoice.paidAmount,
        status: invoice.status
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get client payment history
   * @param {string} orgId - Organization ID
   * @param {string} clientId - Client ID
   * @returns {Object} Payment history
   */
  async getClientPaymentHistory(orgId, clientId) {
    try {
      const invoices = await Invoice.find({
        orgId: orgId,
        clientId: clientId
      })
        .populate('clientId', 'name email')
        .sort({ issueDate: -1 });

      const history = [];
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      invoices.forEach(invoice => {
        const paid = invoice.paidAmount || 0;
        const outstanding = invoice.total - paid;

        totalInvoiced += invoice.total;
        totalPaid += paid;
        totalOutstanding += outstanding;

        history.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total,
          paidAmount: paid,
          outstandingAmount: outstanding,
          status: invoice.status,
          payments: invoice.payments || [],
          lastPaymentDate: invoice.payments && invoice.payments.length > 0
            ? invoice.payments[invoice.payments.length - 1].paymentDate
            : null
        });
      });

      return {
        clientId: clientId,
        clientName: invoices[0]?.clientId?.name || 'Unknown',
        history: history,
        summary: {
          totalInvoices: invoices.length,
          totalInvoiced: totalInvoiced,
          totalPaid: totalPaid,
          totalOutstanding: totalOutstanding,
          averageDaysToPay: this.calculateAverageDaysToPay(history)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting client payment history:', error);
      throw error;
    }
  }

  /**
   * Update chart of accounts for payment
   * @param {string} orgId - Organization ID
   * @param {Object} invoice - Invoice document
   * @param {number} amount - Payment amount
   * @param {Object} payment - Payment record
   */
  async updateChartOfAccounts(orgId, invoice, amount, payment) {
    try {
      // Find cash account
      const cashAccount = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: 'asset',
        code: { $regex: /^1/ }, // Asset accounts start with 1
        name: { $regex: /cash/i }
      });

      // Find accounts receivable account
      const arAccount = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: 'asset',
        code: { $regex: /^1/ },
        name: { $regex: /receivable/i }
      });

      if (cashAccount && arAccount) {
        // Create journal entry for payment
        const entryNumber = await this.generateEntryNumber(orgId);
        
        const journalEntry = new JournalEntry({
          orgId: orgId,
          entryNumber: entryNumber,
          date: payment.paymentDate || new Date(),
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          reference: payment.reference || invoice.invoiceNumber,
          entries: [
            {
              accountId: cashAccount._id,
              debit: amount,
              credit: 0,
              description: `Payment from ${invoice.clientId?.name || 'Client'}`
            },
            {
              accountId: arAccount._id,
              debit: 0,
              credit: amount,
              description: `Invoice ${invoice.invoiceNumber} payment`
            }
          ],
          totalDebit: amount,
          totalCredit: amount,
          status: 'posted',
          relatedInvoiceId: invoice._id,
          postedAt: new Date()
        });

        await journalEntry.save();
      }
    } catch (error) {
      console.error('Error updating chart of accounts:', error);
      // Don't throw - payment recording should still succeed
    }
  }

  /**
   * Generate journal entry number
   * @param {string} orgId - Organization ID
   * @returns {string} Entry number
   */
  async generateEntryNumber(orgId) {
    try {
      const year = new Date().getFullYear();
      const prefix = `JE-${year}-`;

      const lastEntry = await JournalEntry.findOne({
        orgId: orgId,
        entryNumber: { $regex: `^${prefix}` }
      }).sort({ entryNumber: -1 });

      let sequence = 1;
      if (lastEntry && lastEntry.entryNumber) {
        const lastSequence = parseInt(lastEntry.entryNumber.split('-').pop()) || 0;
        sequence = lastSequence + 1;
      }

      return `${prefix}${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      return `JE-${Date.now()}`;
    }
  }

  /**
   * Calculate average days past due
   * @param {Object} agingBuckets - Aging buckets
   * @returns {number} Average days past due
   */
  calculateAverageDaysPastDue(agingBuckets) {
    let totalDays = 0;
    let count = 0;

    Object.values(agingBuckets).forEach(bucket => {
      bucket.forEach(invoice => {
        totalDays += invoice.daysPastDue;
        count++;
      });
    });

    return count > 0 ? Math.round(totalDays / count) : 0;
  }

  /**
   * Find oldest invoice
   * @param {Object} agingBuckets - Aging buckets
   * @returns {Object|null} Oldest invoice
   */
  findOldestInvoice(agingBuckets) {
    let oldest = null;
    let maxDays = 0;

    Object.values(agingBuckets).forEach(bucket => {
      bucket.forEach(invoice => {
        if (invoice.daysPastDue > maxDays) {
          maxDays = invoice.daysPastDue;
          oldest = invoice;
        }
      });
    });

    return oldest;
  }

  /**
   * Calculate average days to pay
   * @param {Array} history - Payment history
   * @returns {number} Average days to pay
   */
  calculateAverageDaysToPay(history) {
    const paidInvoices = history.filter(h => h.status === 'paid' && h.lastPaymentDate);
    
    if (paidInvoices.length === 0) return 0;

    let totalDays = 0;
    paidInvoices.forEach(invoice => {
      const daysToPay = Math.floor(
        (new Date(invoice.lastPaymentDate) - new Date(invoice.issueDate)) / (1000 * 60 * 60 * 24)
      );
      totalDays += daysToPay;
    });

    return Math.round(totalDays / paidInvoices.length);
  }
}

module.exports = new AccountsReceivableService();
