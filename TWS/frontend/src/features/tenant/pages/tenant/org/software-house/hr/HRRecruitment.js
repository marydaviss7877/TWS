import React, { useState, useEffect } from 'react';
import { 
  BriefcaseIcon, 
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const HRRecruitment = () => {
  const tenantSlug = useTenantSlug();
  const [loading, setLoading] = useState(true);
  const [openPositions, setOpenPositions] = useState([]);
  const [stats, setStats] = useState({
    openPositions: 0,
    activeCandidates: 0,
    inReview: 0,
    hiredThisMonth: 0
  });

  useEffect(() => {
    fetchRecruitmentData();
  }, [tenantSlug]);

  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      // Use new recruitment API
      const data = await tenantApiService.getJobPostings(tenantSlug);
      if (data && data.jobs) {
        setOpenPositions(data.jobs);
        setStats({
          openPositions: data.total || data.jobs.length || 0,
          activeCandidates: data.jobs.reduce((sum, job) => sum + (job.applicants || 0), 0),
          inReview: 0,
          hiredThisMonth: 0
        });
      } else {
        setOpenPositions([]);
        setStats({ openPositions: 0, activeCandidates: 0, inReview: 0, hiredThisMonth: 0 });
      }
    } catch (err) {
      console.error('Error fetching recruitment data:', err);
      // Fallback to empty data
      setOpenPositions([]);
      setStats({ openPositions: 0, activeCandidates: 0, inReview: 0, hiredThisMonth: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobPosting = async (jobData) => {
    try {
      await tenantApiService.createJobPosting(tenantSlug, jobData);
      alert('Job posting created successfully!');
      fetchRecruitmentData();
    } catch (error) {
      console.error('Error creating job posting:', error);
      alert(error.message || 'Failed to create job posting. Please try again.');
    }
  };

  const handlePostNewJobClick = async () => {
    const title = window.prompt('Job title');
    if (!title || !title.trim()) return;
    const department = window.prompt('Department', 'General') || 'General';
    const location = window.prompt('Location', 'Remote') || 'Remote';
    const description = window.prompt('Description', '') || '';
    await handleCreateJobPosting({ title: title.trim(), department: department.trim(), location: location.trim(), description: description.trim(), status: 'active' });
  };

  const statsData = [
    { label: 'Open Positions', value: stats.openPositions.toString(), icon: BriefcaseIcon, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Active Candidates', value: stats.activeCandidates.toString(), icon: UserPlusIcon, iconBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'In Review', value: stats.inReview.toString(), icon: ClockIcon, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Hired This Month', value: stats.hiredThisMonth.toString(), icon: CheckCircleIcon, iconBg: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recruitment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Recruitment
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage job postings and candidate applications
          </p>
        </div>
        <button
          onClick={handlePostNewJobClick}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Post New Job</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 xl:w-7 xl:h-7 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Open Positions */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Open Positions
        </h3>
        <div className="space-y-4">
          {openPositions.length === 0 ? (
            <div className="text-center py-12">
              <BriefcaseIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No open positions</p>
            </div>
          ) : (
            openPositions.map((position) => (
              <div key={position.id || position._id || position.title} className="glass-card p-4 hover-lift">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{position.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>{position.department}</span>
                      <span>•</span>
                      <span>{position.location}</span>
                      <span>•</span>
                      <span>{position.applicants} applicants</span>
                      <span>•</span>
                      <span>Posted {position.posted}</span>
                    </div>
                  </div>
                  <button className="glass-button px-4 py-2 rounded-xl hover-scale text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HRRecruitment;

