const ClientHealth = require('../models/ClientHealth');
const ClientTouchpoint = require('../models/ClientTouchpoint');
const Client = require('../models/Client');
const { Invoice: ProjectInvoice } = require('../models/Finance');
const projectApi = require('./module-api/project-api.service');

class ClientHealthService {
  /**
   * Get comprehensive client health data
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Client health data
   */
  async getClientHealthData(orgId, filters = {}) {
    try {
      const clients = await Client.find({ orgId, ...filters })
        .populate('orgId', 'name');

      const healthData = {
        summary: {
          totalClients: clients.length,
          averageHealthScore: 0,
          highRiskClients: 0,
          clientsNeedingAttention: 0,
          totalRevenue: 0,
          totalOutstanding: 0
        },
        clients: [],
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        trends: {}
      };

      let totalHealthScore = 0;
      let highRiskCount = 0;
      let attentionNeededCount = 0;
      let totalRevenue = 0;
      let totalOutstanding = 0;

      for (const client of clients) {
        const clientHealth = await this.getOrCreateClientHealth(client._id, orgId);
        const healthMetrics = await this.calculateClientHealthMetrics(client._id, orgId);
        
        totalHealthScore += clientHealth.healthScore;
        totalRevenue += healthMetrics.financial.totalSpent;
        totalOutstanding += healthMetrics.financial.outstandingAmount;

        if (clientHealth.churnRisk.riskLevel === 'high' || clientHealth.churnRisk.riskLevel === 'critical') {
          highRiskCount++;
        }

        if (clientHealth.healthScore < 50 || clientHealth.churnRisk.riskLevel !== 'low') {
          attentionNeededCount++;
        }

        healthData.riskDistribution[clientHealth.churnRisk.riskLevel]++;

        healthData.clients.push({
          clientId: client._id,
          name: client.name,
          email: client.email,
          healthScore: clientHealth.healthScore,
          healthStatus: clientHealth.healthStatus,
          churnRisk: clientHealth.churnRisk,
          financial: healthMetrics.financial,
          engagement: healthMetrics.engagement,
          projectHealth: healthMetrics.projectHealth,
          satisfaction: healthMetrics.satisfaction,
          alerts: clientHealth.alerts.filter(alert => !alert.acknowledged).length,
          lastUpdated: clientHealth.lastUpdated
        });
      }

      // Calculate summary metrics
      if (clients.length > 0) {
        healthData.summary.averageHealthScore = totalHealthScore / clients.length;
      }
      healthData.summary.highRiskClients = highRiskCount;
      healthData.summary.clientsNeedingAttention = attentionNeededCount;
      healthData.summary.totalRevenue = totalRevenue;
      healthData.summary.totalOutstanding = totalOutstanding;

      // Get trends
      healthData.trends = await this.getHealthTrends(orgId);

      return healthData;

    } catch (error) {
      console.error('Error getting client health data:', error);
      throw error;
    }
  }

  /**
   * Get or create client health record
   * @param {string} clientId - Client ID
   * @param {string} orgId - Organization ID
   * @returns {Object} Client health record
   */
  async getOrCreateClientHealth(clientId, orgId) {
    try {
      let clientHealth = await ClientHealth.findOne({ clientId, orgId });
      
      if (!clientHealth) {
        clientHealth = new ClientHealth({
          clientId,
          orgId,
          healthScore: 75,
          engagement: {
            loginFrequency: 0,
            projectInteractions: 0,
            supportTickets: 0,
            responseTime: 24
          },
          financial: {
            totalSpent: 0,
            averageInvoiceTime: 30,
            paymentReliability: 100,
            outstandingAmount: 0,
            creditScore: 'unknown'
          },
          projectHealth: {
            activeProjects: 0,
            completedProjects: 0,
            onTimeDelivery: 100,
            budgetAdherence: 100,
            satisfactionScore: 5
          },
          churnRisk: {
            riskLevel: 'low',
            riskScore: 25,
            riskFactors: [],
            lastAssessment: new Date()
          },
          satisfaction: {
            overallScore: 5,
            npsScore: 8,
            surveys: [],
            complaints: []
          },
          renewal: {
            renewalProbability: 75,
            expansionOpportunity: 'medium',
            expansionValue: 0
          }
        });
      }

      // Calculate and update health metrics
      await this.updateClientHealthMetrics(clientHealth);
      
      return clientHealth;

    } catch (error) {
      console.error('Error getting/creating client health:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive client health metrics
   * @param {string} clientId - Client ID
   * @param {string} orgId - Organization ID
   * @returns {Object} Health metrics
   */
  async calculateClientHealthMetrics(clientId, orgId) {
    try {
      const metrics = {
        engagement: {
          lastLogin: null,
          loginFrequency: 0,
          projectInteractions: 0,
          supportTickets: 0,
          responseTime: 24
        },
        financial: {
          totalSpent: 0,
          averageInvoiceTime: 30,
          paymentReliability: 100,
          outstandingAmount: 0,
          creditScore: 'unknown'
        },
        projectHealth: {
          activeProjects: 0,
          completedProjects: 0,
          onTimeDelivery: 100,
          budgetAdherence: 100,
          satisfactionScore: 5
        },
        satisfaction: {
          overallScore: 5,
          npsScore: 8,
          recentSurveys: 0,
          recentComplaints: 0
        }
      };

      // Calculate engagement metrics
      const touchpoints = await ClientTouchpoint.find({ clientId, orgId })
        .sort({ createdAt: -1 })
        .limit(100);

      if (touchpoints.length > 0) {
        const lastLogin = touchpoints.find(tp => tp.type === 'portal_login');
        metrics.engagement.lastLogin = lastLogin?.createdAt;

        // Calculate frequencies (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentTouchpoints = touchpoints.filter(tp => tp.createdAt >= thirtyDaysAgo);

        metrics.engagement.loginFrequency = recentTouchpoints.filter(tp => tp.type === 'portal_login').length;
        metrics.engagement.projectInteractions = recentTouchpoints.filter(tp => tp.type === 'project_update').length;
        metrics.engagement.supportTickets = recentTouchpoints.filter(tp => tp.type === 'support_ticket').length;

        // Calculate average response time
        const inboundTouchpoints = recentTouchpoints.filter(tp => tp.direction === 'inbound');
        if (inboundTouchpoints.length > 0) {
          const totalResponseTime = inboundTouchpoints.reduce((sum, tp) => {
            if (tp.responseTime) return sum + tp.responseTime;
            return sum;
          }, 0);
          metrics.engagement.responseTime = totalResponseTime / inboundTouchpoints.length;
        }
      }

      // Calculate financial metrics
      const invoices = await ProjectInvoice.find({ 
        'clientId': clientId,
        status: { $in: ['paid', 'sent', 'overdue'] }
      });

      if (invoices.length > 0) {
        metrics.financial.totalSpent = invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        metrics.financial.outstandingAmount = invoices
          .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
          .reduce((sum, inv) => sum + (inv.total || 0), 0);

        // Calculate payment reliability
        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const totalInvoices = invoices.length;
        metrics.financial.paymentReliability = totalInvoices > 0 ? 
          (paidInvoices.length / totalInvoices) * 100 : 100;

        // Calculate average invoice time
        const paidInvoicesWithDates = paidInvoices.filter(inv => inv.paidAt && inv.createdAt);
        if (paidInvoicesWithDates.length > 0) {
          const totalDays = paidInvoicesWithDates.reduce((sum, inv) => {
            const days = (inv.paidAt - inv.createdAt) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0);
          metrics.financial.averageInvoiceTime = totalDays / paidInvoicesWithDates.length;
        }
      }

      // Calculate project health metrics via Module API (Projects module boundary)
      const projects = await projectApi.getProjectsForClient(orgId, clientId);
      
      metrics.projectHealth.activeProjects = projects.filter(p => p.status === 'active').length;
      metrics.projectHealth.completedProjects = projects.filter(p => p.status === 'completed').length;

      if (projects.length > 0) {
        // Calculate on-time delivery
        const completedProjects = projects.filter(p => p.status === 'completed');
        const onTimeProjects = completedProjects.filter(p => {
          if (!p.timeline.endDate) return true;
          return new Date() <= p.timeline.endDate;
        });
        metrics.projectHealth.onTimeDelivery = completedProjects.length > 0 ? 
          (onTimeProjects.length / completedProjects.length) * 100 : 100;

        // Calculate budget adherence
        const budgetAdherentProjects = projects.filter(p => {
          if (!p.budget.total || !p.budget.spent) return true;
          return p.budget.spent <= p.budget.total;
        });
        metrics.projectHealth.budgetAdherence = projects.length > 0 ? 
          (budgetAdherentProjects.length / projects.length) * 100 : 100;

        // Calculate average satisfaction
        const projectsWithSatisfaction = projects.filter(p => p.metrics.clientSatisfaction);
        if (projectsWithSatisfaction.length > 0) {
          const totalSatisfaction = projectsWithSatisfaction.reduce((sum, p) => 
            sum + p.metrics.clientSatisfaction, 0);
          metrics.projectHealth.satisfactionScore = totalSatisfaction / projectsWithSatisfaction.length;
        }
      }

      // Calculate satisfaction metrics
      const satisfactionSurveys = touchpoints.filter(tp => tp.type === 'survey_response');
      const complaints = touchpoints.filter(tp => tp.type === 'complaint');

      if (satisfactionSurveys.length > 0) {
        const recentSurveys = satisfactionSurveys.filter(s => 
          (new Date() - s.createdAt) < (30 * 24 * 60 * 60 * 1000)
        );
        metrics.satisfaction.recentSurveys = recentSurveys.length;

        if (recentSurveys.length > 0) {
          const totalRating = recentSurveys.reduce((sum, s) => 
            sum + (s.satisfaction?.rating || 5), 0);
          metrics.satisfaction.overallScore = totalRating / recentSurveys.length;
        }
      }

      const recentComplaints = complaints.filter(c => 
        (new Date() - c.createdAt) < (30 * 24 * 60 * 60 * 1000)
      );
      metrics.satisfaction.recentComplaints = recentComplaints.length;

      return metrics;

    } catch (error) {
      console.error('Error calculating client health metrics:', error);
      throw error;
    }
  }

  /**
   * Update client health metrics
   * @param {Object} clientHealth - Client health record
   * @returns {Object} Updated client health
   */
  async updateClientHealthMetrics(clientHealth) {
    try {
      const metrics = await this.calculateClientHealthMetrics(clientHealth.clientId, clientHealth.orgId);
      
      // Update engagement metrics
      clientHealth.engagement = {
        ...clientHealth.engagement,
        ...metrics.engagement
      };

      // Update financial metrics
      clientHealth.financial = {
        ...clientHealth.financial,
        ...metrics.financial
      };

      // Update project health metrics
      clientHealth.projectHealth = {
        ...clientHealth.projectHealth,
        ...metrics.projectHealth
      };

      // Update satisfaction metrics
      clientHealth.satisfaction = {
        ...clientHealth.satisfaction,
        overallScore: metrics.satisfaction.overallScore,
        npsScore: metrics.satisfaction.npsScore
      };

      // Recalculate health score and churn risk
      clientHealth.calculateHealthScore();
      clientHealth.assessChurnRisk();

      // Generate alerts based on new metrics
      await this.generateHealthAlerts(clientHealth);

      await clientHealth.save();
      return clientHealth;

    } catch (error) {
      console.error('Error updating client health metrics:', error);
      throw error;
    }
  }

  /**
   * Generate health alerts based on metrics
   * @param {Object} clientHealth - Client health record
   */
  async generateHealthAlerts(clientHealth) {
    try {
      // Clear existing unacknowledged alerts
      clientHealth.alerts = clientHealth.alerts.filter(alert => alert.acknowledged);

      // Health score alerts
      if (clientHealth.healthScore < 40) {
        clientHealth.addAlert('satisfaction_drop', 'critical', 
          `Client health score is critically low at ${clientHealth.healthScore}`);
      } else if (clientHealth.healthScore < 60) {
        clientHealth.addAlert('satisfaction_drop', 'high', 
          `Client health score is low at ${clientHealth.healthScore}`);
      }

      // Engagement alerts
      if (clientHealth.engagement.lastLogin) {
        const daysSinceLogin = (new Date() - clientHealth.engagement.lastLogin) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin > 30) {
          clientHealth.addAlert('engagement_low', 'medium', 
            `Client has not logged in for ${Math.round(daysSinceLogin)} days`);
        }
      }

      // Financial alerts
      if (clientHealth.financial.paymentReliability < 70) {
        clientHealth.addAlert('payment_delay', 'high', 
          `Client payment reliability is ${clientHealth.financial.paymentReliability}%`);
      }

      if (clientHealth.financial.outstandingAmount > clientHealth.financial.totalSpent * 0.2) {
        clientHealth.addAlert('payment_delay', 'medium', 
          `Client has significant outstanding amount: $${clientHealth.financial.outstandingAmount}`);
      }

      // Churn risk alerts
      if (clientHealth.churnRisk.riskLevel === 'critical') {
        clientHealth.addAlert('churn_risk', 'critical', 
          `Client has critical churn risk (${clientHealth.churnRisk.riskScore}%)`);
      } else if (clientHealth.churnRisk.riskLevel === 'high') {
        clientHealth.addAlert('churn_risk', 'high', 
          `Client has high churn risk (${clientHealth.churnRisk.riskScore}%)`);
      }

      // Renewal alerts
      if (clientHealth.renewal.contractEndDate) {
        const daysUntilRenewal = clientHealth.daysUntilRenewal;
        if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
          clientHealth.addAlert('renewal_due', 'medium', 
            `Client contract expires in ${daysUntilRenewal} days`);
        }
      }

    } catch (error) {
      console.error('Error generating health alerts:', error);
    }
  }

  /**
   * Get health trends over time
   * @param {string} orgId - Organization ID
   * @returns {Object} Trend data
   */
  async getHealthTrends(orgId) {
    try {
      const trends = {
        healthScore: [],
        churnRisk: [],
        engagement: [],
        satisfaction: []
      };

      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - i);
        startDate.setDate(1);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        const monthData = await this.getMonthlyHealthMetrics(orgId, startDate, endDate);
        
        trends.healthScore.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageHealthScore
        });
        
        trends.churnRisk.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageChurnRisk
        });
        
        trends.engagement.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageEngagement
        });
        
        trends.satisfaction.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageSatisfaction
        });
      }

      return trends;

    } catch (error) {
      console.error('Error getting health trends:', error);
      return { healthScore: [], churnRisk: [], engagement: [], satisfaction: [] };
    }
  }

  /**
   * Get monthly health metrics
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Monthly metrics
   */
  async getMonthlyHealthMetrics(orgId, startDate, endDate) {
    try {
      const clients = await Client.find({ orgId });
      
      let totalHealthScore = 0;
      let totalChurnRisk = 0;
      let totalEngagement = 0;
      let totalSatisfaction = 0;
      let clientCount = 0;

      for (const client of clients) {
        const clientHealth = await ClientHealth.findOne({ clientId: client._id, orgId });
        
        if (clientHealth && clientHealth.lastUpdated >= startDate && clientHealth.lastUpdated <= endDate) {
          totalHealthScore += clientHealth.healthScore;
          totalChurnRisk += clientHealth.churnRisk.riskScore;
          totalEngagement += clientHealth.engagement.loginFrequency;
          totalSatisfaction += clientHealth.satisfaction.overallScore;
          clientCount++;
        }
      }

      return {
        averageHealthScore: clientCount > 0 ? totalHealthScore / clientCount : 0,
        averageChurnRisk: clientCount > 0 ? totalChurnRisk / clientCount : 0,
        averageEngagement: clientCount > 0 ? totalEngagement / clientCount : 0,
        averageSatisfaction: clientCount > 0 ? totalSatisfaction / clientCount : 0,
        clientCount
      };

    } catch (error) {
      console.error('Error getting monthly health metrics:', error);
      return {
        averageHealthScore: 0,
        averageChurnRisk: 0,
        averageEngagement: 0,
        averageSatisfaction: 0,
        clientCount: 0
      };
    }
  }

  /**
   * Get clients needing attention
   * @param {string} orgId - Organization ID
   * @returns {Array} Clients needing attention
   */
  async getClientsNeedingAttention(orgId) {
    try {
      return await ClientHealth.findClientsNeedingAttention(orgId);
    } catch (error) {
      console.error('Error getting clients needing attention:', error);
      throw error;
    }
  }

  /**
   * Get high-risk clients
   * @param {string} orgId - Organization ID
   * @returns {Array} High-risk clients
   */
  async getHighRiskClients(orgId) {
    try {
      return await ClientHealth.findHighRiskClients(orgId);
    } catch (error) {
      console.error('Error getting high-risk clients:', error);
      throw error;
    }
  }

  /**
   * Add client touchpoint
   * @param {string} clientId - Client ID
   * @param {string} orgId - Organization ID
   * @param {Object} touchpointData - Touchpoint data
   * @returns {Object} Created touchpoint
   */
  async addClientTouchpoint(clientId, orgId, touchpointData) {
    try {
      const touchpoint = new ClientTouchpoint({
        clientId,
        orgId,
        ...touchpointData
      });

      await touchpoint.save();

      // Update client health metrics
      const clientHealth = await this.getOrCreateClientHealth(clientId, orgId);
      await this.updateClientHealthMetrics(clientHealth);

      return touchpoint;

    } catch (error) {
      console.error('Error adding client touchpoint:', error);
      throw error;
    }
  }

  /**
   * Get client touchpoint history
   * @param {string} clientId - Client ID
   * @param {number} limit - Number of touchpoints to return
   * @returns {Array} Touchpoint history
   */
  async getClientTouchpointHistory(clientId, limit = 50) {
    try {
      return await ClientTouchpoint.getClientHistory(clientId, limit);
    } catch (error) {
      console.error('Error getting client touchpoint history:', error);
      throw error;
    }
  }

  /**
   * Acknowledge client health alert
   * @param {string} clientId - Client ID
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID acknowledging
   * @returns {Object} Updated client health
   */
  async acknowledgeAlert(clientId, alertId, userId) {
    try {
      const clientHealth = await ClientHealth.findOne({ clientId });
      if (!clientHealth) {
        throw new Error('Client health record not found');
      }

      clientHealth.acknowledgeAlert(alertId, userId);
      await clientHealth.save();

      return clientHealth;

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }
}

module.exports = new ClientHealthService();
