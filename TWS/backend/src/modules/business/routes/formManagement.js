const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const { validateFormData, validateResponseData, validateJobPostingData, validateInterviewData } = require('../../../middleware/validation/formValidation');
const formRead = requireErpAccess({ module: 'employees', action: ['read', 'read_own'], checkRevocation: false });
const formWrite = requireErpAccess({ allowedRoles: ['admin', 'hr_manager'], checkRevocation: false });
router.use(verifyERPToken);

// In-memory storage for demo purposes - in production, use a proper database
let formTemplates = [
  {
    id: '1',
    title: 'Software Developer Job Posting',
    description: 'Comprehensive form for software developer positions including technical skills, experience, and cultural fit assessment.',
    category: 'job_posting',
    tags: ['engineering', 'technical', 'full-time'],
    fields: [
      { id: 'field_1', type: 'text', label: 'Job Title', required: true, placeholder: 'e.g., Senior Developer' },
      { id: 'field_2', type: 'select', label: 'Department', required: true, options: ['Engineering', 'Product', 'Design'] },
      { id: 'field_3', type: 'multiselect', label: 'Required Skills', required: true, options: ['JavaScript', 'React', 'Node.js', 'Python'] },
      { id: 'field_4', type: 'textarea', label: 'Job Description', required: true, placeholder: 'Detailed job description...' },
      { id: 'field_5', type: 'rating', label: 'Experience Level', required: true, maxRating: 5 }
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireAuthentication: true,
      showProgressBar: true,
      autoSave: true
    },
    metadata: {
      createdBy: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T14:45:00Z',
      version: 2
    },
    usageCount: 45,
    isActive: true
  },
  {
    id: '2',
    title: 'Marketing Manager Interview',
    description: 'Structured interview form for marketing manager candidates with behavioral and technical questions.',
    category: 'interview_form',
    tags: ['marketing', 'management', 'interview'],
    fields: [
      { id: 'field_1', type: 'text', label: 'Candidate Name', required: true },
      { id: 'field_2', type: 'select', label: 'Interview Round', required: true, options: ['Phone Screen', 'Technical', 'Final'] },
      { id: 'field_3', type: 'rating', label: 'Communication Skills', required: true, maxRating: 5 },
      { id: 'field_4', type: 'rating', label: 'Leadership Skills', required: true, maxRating: 5 },
      { id: 'field_5', type: 'textarea', label: 'Interview Notes', required: false }
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireAuthentication: true,
      showProgressBar: true,
      autoSave: true
    },
    metadata: {
      createdBy: 'hr_manager',
      createdAt: '2024-01-10T09:15:00Z',
      updatedAt: '2024-01-18T16:20:00Z',
      version: 1
    },
    usageCount: 23,
    isActive: true
  }
];

let jobPostings = [
  {
    id: '1',
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    employmentType: 'Full-time',
    experienceLevel: 'Senior',
    salaryRange: { min: 120000, max: 180000 },
    status: 'active',
    applicants: 23,
    views: 156,
    formTemplateId: '1',
    postedBy: 'admin',
    postedAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z',
    expiresAt: '2024-02-15T10:30:00Z',
    tags: ['javascript', 'react', 'nodejs', 'remote'],
    description: 'We are looking for a senior full-stack developer to join our engineering team...'
  }
];

let formResponses = [
  {
    id: '1',
    formId: '1',
    jobPostingId: '1',
    candidate: {
      name: 'Alex Johnson',
      email: 'alex.johnson@email.com',
      phone: '+1 (555) 123-4567',
      experience: '5 years',
      location: 'San Francisco, CA'
    },
    responses: {
      'Job Title': 'Senior Full-Stack Developer',
      'Department': 'Engineering',
      'Employment Type': 'Full-time',
      'Experience Level': 'Senior Level',
      'Location': 'San Francisco, CA',
      'Work Arrangement': 'Remote',
      'Required Skills': ['JavaScript', 'React', 'Node.js', 'Python'],
      'Preferred Skills': ['TypeScript', 'GraphQL', 'AWS'],
      'Job Description': 'We are looking for a senior full-stack developer to join our engineering team...',
      'Key Responsibilities': 'Lead development of web applications, mentor junior developers, collaborate with product team...',
      'Qualifications': '5+ years of experience in full-stack development, strong knowledge of modern JavaScript frameworks...'
    },
    status: 'submitted',
    submittedAt: '2024-01-22T14:30:00Z',
    reviewedBy: null,
    reviewedAt: null,
    score: null,
    notes: ''
  }
];

let interviews = [
  {
    id: '1',
    candidate: {
      name: 'Alex Johnson',
      email: 'alex.johnson@email.com',
      phone: '+1 (555) 123-4567',
      position: 'Senior Full-Stack Developer',
      experience: '5 years',
      location: 'San Francisco, CA',
      resume: 'alex_johnson_resume.pdf',
      portfolio: 'https://alexjohnson.dev'
    },
    job: {
      id: '1',
      title: 'Senior Full-Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      salaryRange: { min: 120000, max: 180000 }
    },
    interviewer: {
      name: 'Sarah Chen',
      role: 'Engineering Manager',
      email: 'sarah.chen@company.com'
    },
    scheduledAt: '2024-01-25T14:00:00Z',
    duration: 60,
    type: 'video',
    status: 'scheduled',
    formTemplateId: '2',
    responses: null,
    notes: '',
    createdAt: '2024-01-20T10:30:00Z',
    updatedAt: '2024-01-20T10:30:00Z'
  }
];

// Form Templates Routes
router.get('/templates', formRead, (req, res) => {
  try {
    const { category, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    let filteredTemplates = [...formTemplates];
    
    // Filter by category
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.category === category);
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.title.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort templates
    filteredTemplates.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.metadata.createdAt);
          bValue = new Date(b.metadata.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.metadata.updatedAt);
          bValue = new Date(b.metadata.updatedAt);
          break;
        case 'usageCount':
          aValue = a.usageCount;
          bValue = b.usageCount;
          break;
        default:
          aValue = new Date(a.metadata.updatedAt);
          bValue = new Date(b.metadata.updatedAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      data: filteredTemplates,
      total: filteredTemplates.length
    });
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form templates',
      error: error.message
    });
  }
});

router.get('/templates/:id', formRead, (req, res) => {
  try {
    const template = formTemplates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Form template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form template',
      error: error.message
    });
  }
});

router.post('/templates', formWrite, validateFormData, (req, res) => {
  try {
    const { title, description, category, fields, settings, tags } = req.body;
    
    const newTemplate = {
      id: Date.now().toString(),
      title,
      description,
      category,
      tags: tags || [],
      fields: fields || [],
      settings: {
        allowMultipleSubmissions: false,
        requireAuthentication: true,
        showProgressBar: true,
        autoSave: true,
        ...settings
      },
      metadata: {
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      },
      usageCount: 0,
      isActive: true
    };
    
    formTemplates.push(newTemplate);
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Form template created successfully'
    });
  } catch (error) {
    console.error('Error creating form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form template',
      error: error.message
    });
  }
});

router.put('/templates/:id', formWrite, validateFormData, (req, res) => {
  try {
    const templateIndex = formTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Form template not found'
      });
    }
    
    const { title, description, category, fields, settings, tags } = req.body;
    
    formTemplates[templateIndex] = {
      ...formTemplates[templateIndex],
      title,
      description,
      category,
      tags: tags || formTemplates[templateIndex].tags,
      fields: fields || formTemplates[templateIndex].fields,
      settings: {
        ...formTemplates[templateIndex].settings,
        ...settings
      },
      metadata: {
        ...formTemplates[templateIndex].metadata,
        updatedAt: new Date().toISOString(),
        version: formTemplates[templateIndex].metadata.version + 1
      }
    };
    
    res.json({
      success: true,
      data: formTemplates[templateIndex],
      message: 'Form template updated successfully'
    });
  } catch (error) {
    console.error('Error updating form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update form template',
      error: error.message
    });
  }
});

router.delete('/templates/:id', formWrite, (req, res) => {
  try {
    const templateIndex = formTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Form template not found'
      });
    }
    
    formTemplates.splice(templateIndex, 1);
    
    res.json({
      success: true,
      message: 'Form template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete form template',
      error: error.message
    });
  }
});

// Job Postings Routes
router.get('/job-postings', formRead, (req, res) => {
  try {
    const { status, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    let filteredJobs = [...jobPostings];
    
    // Filter by status
    if (status && status !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.status === status);
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredJobs = filteredJobs.filter(job =>
        job.title.toLowerCase().includes(searchLower) ||
        job.department.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort jobs
    filteredJobs.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'applicants':
          aValue = a.applicants;
          bValue = b.applicants;
          break;
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        case 'postedAt':
          aValue = new Date(a.postedAt);
          bValue = new Date(b.postedAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      data: filteredJobs,
      total: filteredJobs.length
    });
  } catch (error) {
    console.error('Error fetching job postings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job postings',
      error: error.message
    });
  }
});

router.post('/job-postings', formWrite, (req, res) => {
  try {
    const { title, department, location, employmentType, experienceLevel, salaryRange, formTemplateId, description, tags } = req.body;
    
    const newJobPosting = {
      id: Date.now().toString(),
      title,
      department,
      location,
      employmentType,
      experienceLevel,
      salaryRange,
      status: 'draft',
      applicants: 0,
      views: 0,
      formTemplateId,
      postedBy: req.user.id,
      postedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: null,
      tags: tags || [],
      description
    };
    
    jobPostings.push(newJobPosting);
    
    res.status(201).json({
      success: true,
      data: newJobPosting,
      message: 'Job posting created successfully'
    });
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job posting',
      error: error.message
    });
  }
});

// Form Responses Routes
router.get('/responses', formRead, (req, res) => {
  try {
    const { formId, jobPostingId, status, search, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
    
    let filteredResponses = [...formResponses];
    
    // Filter by form ID
    if (formId) {
      filteredResponses = filteredResponses.filter(response => response.formId === formId);
    }
    
    // Filter by job posting ID
    if (jobPostingId) {
      filteredResponses = filteredResponses.filter(response => response.jobPostingId === jobPostingId);
    }
    
    // Filter by status
    if (status && status !== 'all') {
      filteredResponses = filteredResponses.filter(response => response.status === status);
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResponses = filteredResponses.filter(response =>
        response.candidate.name.toLowerCase().includes(searchLower) ||
        response.candidate.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort responses
    filteredResponses.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'candidateName':
          aValue = a.candidate.name.toLowerCase();
          bValue = b.candidate.name.toLowerCase();
          break;
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'score':
          aValue = a.score || 0;
          bValue = b.score || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      data: filteredResponses,
      total: filteredResponses.length
    });
  } catch (error) {
    console.error('Error fetching form responses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form responses',
      error: error.message
    });
  }
});

router.post('/responses', formRead, validateResponseData, (req, res) => {
  try {
    const { formId, jobPostingId, candidate, responses } = req.body;
    
    const newResponse = {
      id: Date.now().toString(),
      formId,
      jobPostingId,
      candidate,
      responses,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      score: null,
      notes: ''
    };
    
    formResponses.push(newResponse);
    
    // Update job posting applicants count
    const jobIndex = jobPostings.findIndex(job => job.id === jobPostingId);
    if (jobIndex !== -1) {
      jobPostings[jobIndex].applicants += 1;
    }
    
    res.status(201).json({
      success: true,
      data: newResponse,
      message: 'Form response submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting form response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit form response',
      error: error.message
    });
  }
});

// Interview Routes
router.get('/interviews', formRead, (req, res) => {
  try {
    const { status, search, sortBy = 'scheduledAt', sortOrder = 'asc' } = req.query;
    
    let filteredInterviews = [...interviews];
    
    // Filter by status
    if (status && status !== 'all') {
      filteredInterviews = filteredInterviews.filter(interview => interview.status === status);
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInterviews = filteredInterviews.filter(interview =>
        interview.candidate.name.toLowerCase().includes(searchLower) ||
        interview.job.title.toLowerCase().includes(searchLower) ||
        interview.interviewer.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort interviews
    filteredInterviews.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'candidateName':
          aValue = a.candidate.name.toLowerCase();
          bValue = b.candidate.name.toLowerCase();
          break;
        case 'jobTitle':
          aValue = a.job.title.toLowerCase();
          bValue = b.job.title.toLowerCase();
          break;
        case 'scheduledAt':
          aValue = new Date(a.scheduledAt);
          bValue = new Date(b.scheduledAt);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.scheduledAt);
          bValue = new Date(b.scheduledAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    res.json({
      success: true,
      data: filteredInterviews,
      total: filteredInterviews.length
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews',
      error: error.message
    });
  }
});

router.post('/interviews', formWrite, (req, res) => {
  try {
    const { candidate, job, interviewer, scheduledAt, duration, type, formTemplateId } = req.body;
    
    const newInterview = {
      id: Date.now().toString(),
      candidate,
      job,
      interviewer,
      scheduledAt,
      duration,
      type,
      status: 'scheduled',
      formTemplateId,
      responses: null,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    interviews.push(newInterview);
    
    res.status(201).json({
      success: true,
      data: newInterview,
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
});

router.put('/interviews/:id', formRead, (req, res) => {
  try {
    const interviewIndex = interviews.findIndex(i => i.id === req.params.id);
    
    if (interviewIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    const { responses, notes, status } = req.body;
    
    interviews[interviewIndex] = {
      ...interviews[interviewIndex],
      responses,
      notes,
      status: status || interviews[interviewIndex].status,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: interviews[interviewIndex],
      message: 'Interview updated successfully'
    });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interview',
      error: error.message
    });
  }
});

// Analytics Routes
router.get('/analytics/overview', formRead, (req, res) => {
  try {
    const totalTemplates = formTemplates.length;
    const totalJobPostings = jobPostings.length;
    const totalResponses = formResponses.length;
    const totalInterviews = interviews.length;
    
    const activeJobs = jobPostings.filter(job => job.status === 'active').length;
    const completedInterviews = interviews.filter(interview => interview.status === 'completed').length;
    
    const avgScore = formResponses
      .filter(r => r.score !== null)
      .reduce((sum, r) => sum + r.score, 0) / formResponses.filter(r => r.score !== null).length || 0;
    
    const responseRate = totalJobPostings > 0 ? (totalResponses / totalJobPostings) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalTemplates,
        totalJobPostings,
        totalResponses,
        totalInterviews,
        activeJobs,
        completedInterviews,
        avgScore: avgScore.toFixed(1),
        responseRate: responseRate.toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

module.exports = router;
