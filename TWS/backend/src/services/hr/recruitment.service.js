// Note: This service integrates with form management system for job postings
// In production, you'd want dedicated JobPosting, JobApplication, Interview models

class RecruitmentService {
  /**
   * Get job postings
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Job postings with pagination
   */
  async getJobPostings(orgId, filters = {}) {
    try {
      // For now, integrate with form management system
      // In production, use dedicated JobPosting model
      const FormTemplate = require('../../models/documents/FormTemplate');
      const FormResponse = require('../../models/documents/FormResponse');
      
      // Get job posting form templates
      const jobPostings = await FormTemplate.find({
        orgId: orgId,
        category: 'job_posting',
        isActive: true
      })
        .sort({ createdAt: -1 })
        .lean();

      const postingIds = jobPostings.map(posting => posting._id);
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      const applicationStats = postingIds.length
        ? await FormResponse.aggregate([
            { $match: { orgId, formId: { $in: postingIds } } },
            {
              $group: {
                _id: '$formId',
                applicants: { $sum: 1 },
                inReview: { $sum: { $cond: [{ $eq: ['$status', 'in-review'] }, 1, 0] } },
                accepted: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'accepted'] },
                          { $gte: ['$createdAt', currentMonthStart] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ])
        : [];
      const statsByPosting = new Map(applicationStats.map(item => [String(item._id), item]));
      const enhancedPostings = jobPostings.map(posting => ({
        ...posting,
        applicants: statsByPosting.get(String(posting._id))?.applicants || 0,
        inReview: statsByPosting.get(String(posting._id))?.inReview || 0,
        accepted: statsByPosting.get(String(posting._id))?.accepted || 0,
        views: posting.views || 0
      }));

      return {
        jobs: enhancedPostings,
        total: enhancedPostings.length
      };
    } catch (error) {
      console.error('Error getting job postings:', error);
      throw error;
    }
  }

  /**
   * Create job posting
   * @param {string} orgId - Organization ID
   * @param {Object} jobData - Job posting data
   * @returns {Object} Created job posting
   */
  async createJobPosting(orgId, jobData) {
    try {
      const FormTemplate = require('../../models/documents/FormTemplate');
      
      // Create form template for job posting
      const jobPosting = new FormTemplate({
        orgId: orgId,
        title: jobData.title,
        description: jobData.description,
        category: 'job_posting',
        fields: jobData.requirements || [],
        settings: {
          allowMultipleSubmissions: false,
          requireAuthentication: false,
          showProgressBar: true
        },
        metadata: {
          department: jobData.department,
          location: jobData.location,
          employmentType: jobData.employmentType,
          experienceLevel: jobData.experienceLevel,
          salaryRange: jobData.salaryRange,
          status: jobData.status || 'draft',
          expiresAt: jobData.expiresAt,
          tags: jobData.tags || []
        },
        isActive: true
      });

      await jobPosting.save();
      return jobPosting;
    } catch (error) {
      console.error('Error creating job posting:', error);
      throw error;
    }
  }

  /**
   * Get job applications
   * @param {string} orgId - Organization ID
   * @param {string} jobId - Job posting ID
   * @returns {Array} Job applications
   */
  async getJobApplications(orgId, jobId) {
    try {
      const FormResponse = require('../../models/documents/FormResponse');
      
      const applications = await FormResponse.find({
        formId: jobId,
        orgId: orgId
      })
        .sort({ createdAt: -1 })
        .lean();

      return applications;
    } catch (error) {
      console.error('Error getting job applications:', error);
      throw error;
    }
  }

  /**
   * Get interviews
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Array} Interviews
   */
  async getInterviews(orgId, filters = {}) {
    try {
      const Interview = require('../../models/hr-payroll/Interview');
      const query = { orgId };
      if (filters.status) query.status = filters.status;
      if (filters.jobId) query.jobId = filters.jobId;
      if (filters.applicationId) query.applicationId = filters.applicationId;
      if (filters.startDate || filters.endDate) {
        query.scheduledAt = {};
        if (filters.startDate) query.scheduledAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.scheduledAt.$lte = new Date(filters.endDate);
      }
      return Interview.find(query)
        .populate('jobId', 'title metadata.department')
        .populate('applicationId', 'payload status')
        .populate('interviewers', 'fullName email')
        .sort({ scheduledAt: 1 })
        .lean();
    } catch (error) {
      console.error('Error getting interviews:', error);
      throw error;
    }
  }

  /**
   * Create interview
   * @param {string} orgId - Organization ID
   * @param {Object} interviewData - Interview data
   * @returns {Object} Created interview
   */
  async createInterview(orgId, interviewData) {
    try {
      const Interview = require('../../models/hr-payroll/Interview');
      const FormTemplate = require('../../models/documents/FormTemplate');
      const FormResponse = require('../../models/documents/FormResponse');
      const { jobId, applicationId, scheduledAt, createdBy } = interviewData;
      if (!jobId || !applicationId || !scheduledAt || !createdBy) {
        throw new Error('jobId, applicationId, scheduledAt, and createdBy are required');
      }
      const [job, application] = await Promise.all([
        FormTemplate.findOne({ _id: jobId, orgId, category: 'job_posting', isActive: true }).lean(),
        FormResponse.findOne({ _id: applicationId, orgId, formId: jobId }).lean()
      ]);
      if (!job || !application) throw new Error('Job application not found');

      return Interview.create({
        orgId,
        jobId,
        applicationId,
        candidateName: interviewData.candidateName || application.payload?.fullName || 'Candidate',
        candidateEmail: interviewData.candidateEmail || application.payload?.email,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: interviewData.durationMinutes || 60,
        type: interviewData.type || 'technical',
        status: interviewData.status || 'scheduled',
        interviewers: Array.isArray(interviewData.interviewers) ? interviewData.interviewers : [],
        location: interviewData.location,
        meetingUrl: interviewData.meetingUrl,
        notes: interviewData.notes,
        createdBy
      });
    } catch (error) {
      console.error('Error creating interview:', error);
      throw error;
    }
  }
}

module.exports = new RecruitmentService();
