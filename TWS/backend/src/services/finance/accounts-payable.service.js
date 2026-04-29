const { Bill, Vendor, JournalEntry, ChartOfAccounts } = require('../../models/finance/Finance');

class AccountsPayableService {
  /**
   * Get aging report for bills
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Aging report
   */
  async getAgingReport(orgId, filters = {}) {
    try {
      const { vendorId, startDate, endDate } = filters;
      
      const query = {
        orgId: orgId,
        status: { $in: ['pending', 'approved', 'partial', 'overdue'] }
      };

      if (vendorId) query.vendorId = vendorId;
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      const bills = await Bill.find(query)
        .populate('vendorId', 'name email')
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

      bills.forEach(bill => {
        const daysPastDue = Math.floor((today - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24));
        const outstandingAmount = bill.total - (bill.paidAmount || 0);

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
          billId: bill._id,
          billNumber: bill.billNumber,
          vendorId: bill.vendorId?._id,
          vendorName: bill.vendorId?.name || 'Unknown',
          issueDate: bill.issueDate,
          dueDate: bill.dueDate,
          total: bill.total,
          paidAmount: bill.paidAmount || 0,
          outstandingAmount: outstandingAmount,
          daysPastDue: daysPastDue,
          status: bill.status
        });

        totals[bucket] += outstandingAmount;
        totals.total += outstandingAmount;
      });

      return {
        agingBuckets: agingBuckets,
        totals: totals,
        summary: {
          totalBills: bills.length,
          totalOutstanding: totals.total,
          averageDaysPastDue: this.calculateAverageDaysPastDue(agingBuckets),
          oldestBill: this.findOldestBill(agingBuckets)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting aging report:', error);
      throw error;
    }
  }

  /**
   * Record bill payment
   * @param {string} orgId - Organization ID
   * @param {string} billId - Bill ID
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment record
   */
  async recordPayment(orgId, billId, paymentData) {
    try {
      const { amount, paymentDate, paymentMethod, reference, notes } = paymentData;

      const bill = await Bill.findOne({ _id: billId, orgId: orgId })
        .populate('vendorId', 'name');

      if (!bill) {
        throw new Error('Bill not found');
      }

      const outstandingAmount = bill.total - (bill.paidAmount || 0);
      
      if (amount > outstandingAmount) {
        throw new Error(`Payment amount (${amount}) exceeds outstanding amount (${outstandingAmount})`);
      }

      // Create payment record
      if (!bill.payments) {
        bill.payments = [];
      }

      const payment = {
        amount: amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        reference: reference,
        notes: notes,
        recordedAt: new Date()
      };

      bill.payments.push(payment);
      bill.paidAmount = (bill.paidAmount || 0) + amount;

      // Update bill status
      if (bill.paidAmount >= bill.total) {
        bill.status = 'paid';
        bill.paidAt = new Date();
      } else if (bill.paidAmount > 0) {
        bill.status = 'partial';
      }

      await bill.save();

      // Update chart of accounts (cash/credit, AP/debit)
      await this.updateChartOfAccounts(orgId, bill, amount, payment);

      return {
        success: true,
        billId: bill._id,
        billNumber: bill.billNumber,
        payment: payment,
        newPaidAmount: bill.paidAmount,
        outstandingAmount: bill.total - bill.paidAmount,
        status: bill.status
      };
    } catch (error) {
      console.error('Error recording bill payment:', error);
      throw error;
    }
  }

  /**
   * Get vendor payment history
   * @param {string} orgId - Organization ID
   * @param {string} vendorId - Vendor ID
   * @returns {Object} Payment history
   */
  async getVendorPaymentHistory(orgId, vendorId) {
    try {
      const bills = await Bill.find({
        orgId: orgId,
        vendorId: vendorId
      })
        .populate('vendorId', 'name email')
        .sort({ issueDate: -1 });

      const history = [];
      let totalBilled = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      bills.forEach(bill => {
        const paid = bill.paidAmount || 0;
        const outstanding = bill.total - paid;

        totalBilled += bill.total;
        totalPaid += paid;
        totalOutstanding += outstanding;

        history.push({
          billId: bill._id,
          billNumber: bill.billNumber,
          issueDate: bill.issueDate,
          dueDate: bill.dueDate,
          total: bill.total,
          paidAmount: paid,
          outstandingAmount: outstanding,
          status: bill.status,
          payments: bill.payments || [],
          lastPaymentDate: bill.payments && bill.payments.length > 0
            ? bill.payments[bill.payments.length - 1].paymentDate
            : null
        });
      });

      return {
        vendorId: vendorId,
        vendorName: bills[0]?.vendorId?.name || 'Unknown',
        history: history,
        summary: {
          totalBills: bills.length,
          totalBilled: totalBilled,
          totalPaid: totalPaid,
          totalOutstanding: totalOutstanding,
          averageDaysToPay: this.calculateAverageDaysToPay(history)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting vendor payment history:', error);
      throw error;
    }
  }

  /**
   * Schedule bill payment
   * @param {string} orgId - Organization ID
   * @param {string} billId - Bill ID
   * @param {Object} scheduleData - Schedule data
   * @returns {Object} Scheduled payment
   */
  async schedulePayment(orgId, billId, scheduleData) {
    try {
      const { paymentDate, amount, paymentMethod, notes } = scheduleData;

      const bill = await Bill.findOne({ _id: billId, orgId: orgId });

      if (!bill) {
        throw new Error('Bill not found');
      }

      const outstandingAmount = bill.total - (bill.paidAmount || 0);
      const scheduledAmount = amount || outstandingAmount;

      if (scheduledAmount > outstandingAmount) {
        throw new Error(`Scheduled amount exceeds outstanding amount`);
      }

      if (!bill.scheduledPayments) {
        bill.scheduledPayments = [];
      }

      const scheduledPayment = {
        amount: scheduledAmount,
        scheduledDate: new Date(paymentDate),
        paymentMethod: paymentMethod || 'bank_transfer',
        notes: notes,
        status: 'scheduled',
        createdAt: new Date()
      };

      bill.scheduledPayments.push(scheduledPayment);
      bill.status = 'scheduled';
      await bill.save();

      return {
        success: true,
        billId: bill._id,
        billNumber: bill.billNumber,
        scheduledPayment: scheduledPayment
      };
    } catch (error) {
      console.error('Error scheduling payment:', error);
      throw error;
    }
  }

  /**
   * Approve bill
   * @param {string} orgId - Organization ID
   * @param {string} billId - Bill ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Object} Approved bill
   */
  async approveBill(orgId, billId, approvedBy) {
    try {
      const bill = await Bill.findOne({ _id: billId, orgId: orgId });

      if (!bill) {
        throw new Error('Bill not found');
      }

      bill.status = 'approved';
      bill.approvedBy = approvedBy;
      bill.approvedAt = new Date();
      await bill.save();

      return {
        success: true,
        billId: bill._id,
        billNumber: bill.billNumber,
        status: bill.status,
        approvedAt: bill.approvedAt
      };
    } catch (error) {
      console.error('Error approving bill:', error);
      throw error;
    }
  }

  /**
   * Update chart of accounts for bill payment
   * @param {string} orgId - Organization ID
   * @param {Object} bill - Bill document
   * @param {number} amount - Payment amount
   * @param {Object} payment - Payment record
   */
  async updateChartOfAccounts(orgId, bill, amount, payment) {
    try {
      // Find cash account
      const cashAccount = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: 'asset',
        code: { $regex: /^1/ },
        name: { $regex: /cash/i }
      });

      // Find accounts payable account
      const apAccount = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: 'liability',
        code: { $regex: /^2/ },
        name: { $regex: /payable/i }
      });

      if (cashAccount && apAccount) {
        // Create journal entry for payment
        const entryNumber = await this.generateEntryNumber(orgId);
        
        const journalEntry = new JournalEntry({
          orgId: orgId,
          entryNumber: entryNumber,
          date: payment.paymentDate || new Date(),
          description: `Payment made for bill ${bill.billNumber}`,
          reference: payment.reference || bill.billNumber,
          entries: [
            {
              accountId: apAccount._id,
              debit: amount,
              credit: 0,
              description: `Bill ${bill.billNumber} payment`
            },
            {
              accountId: cashAccount._id,
              debit: 0,
              credit: amount,
              description: `Payment to ${bill.vendorId?.name || 'Vendor'}`
            }
          ],
          totalDebit: amount,
          totalCredit: amount,
          status: 'posted',
          relatedInvoiceId: bill._id,
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
      bucket.forEach(bill => {
        totalDays += bill.daysPastDue;
        count++;
      });
    });

    return count > 0 ? Math.round(totalDays / count) : 0;
  }

  /**
   * Find oldest bill
   * @param {Object} agingBuckets - Aging buckets
   * @returns {Object|null} Oldest bill
   */
  findOldestBill(agingBuckets) {
    let oldest = null;
    let maxDays = 0;

    Object.values(agingBuckets).forEach(bucket => {
      bucket.forEach(bill => {
        if (bill.daysPastDue > maxDays) {
          maxDays = bill.daysPastDue;
          oldest = bill;
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
    const paidBills = history.filter(h => h.status === 'paid' && h.lastPaymentDate);
    
    if (paidBills.length === 0) return 0;

    let totalDays = 0;
    paidBills.forEach(bill => {
      const daysToPay = Math.floor(
        (new Date(bill.lastPaymentDate) - new Date(bill.issueDate)) / (1000 * 60 * 60 * 24)
      );
      totalDays += daysToPay;
    });

    return Math.round(totalDays / paidBills.length);
  }
}

module.exports = new AccountsPayableService();
