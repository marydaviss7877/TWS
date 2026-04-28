import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  AcademicCapIcon, 
  BookOpenIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';

const HRTraining = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [stats, setStats] = useState({
    activePrograms: 0,
    totalCourses: 0,
    enrolledEmployees: 0,
    completedThisMonth: 0
  });

  useEffect(() => {
    fetchTrainingData();
  }, [tenantSlug]);

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getTrainingData(tenantSlug);
      const programs = data?.programs || data?.data?.programs || [];
      const overview = data?.stats || data?.data?.stats || {};
      setTrainingPrograms(programs);
      setStats({
        activePrograms: Number(overview.activePrograms || 0),
        totalCourses: Number(overview.totalCourses || 0),
        enrolledEmployees: Number(overview.enrolledEmployees || 0),
        completedThisMonth: Number(overview.completedThisMonth || 0)
      });
    } catch (err) {
      console.error('Error fetching training data:', err);
      setTrainingPrograms([]);
      setStats({ activePrograms: 0, totalCourses: 0, enrolledEmployees: 0, completedThisMonth: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { label: 'Active Programs', value: stats.activePrograms.toString(), icon: AcademicCapIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { label: 'Total Courses', value: stats.totalCourses.toString(), icon: BookOpenIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Enrolled Employees', value: stats.enrolledEmployees.toString(), icon: VideoCameraIcon, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' },
    { label: 'Completed This Month', value: stats.completedThisMonth.toString(), icon: CheckCircleIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading training data...</p>
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
            Training & Development
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage employee training programs and courses
          </p>
        </div>
        <button className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Create Program</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shadow-glow-lg`}>
                <stat.icon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
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

      {/* Training Programs */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Active Training Programs
        </h3>
        <div className="space-y-4">
          {trainingPrograms.length === 0 ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No active training programs</p>
            </div>
          ) : (
            trainingPrograms.map((program, index) => (
              <div key={index} className="glass-card p-4 hover-lift">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-glow">
                    <AcademicCapIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{program.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span>{program.participants} participants</span>
                      <span>•</span>
                      <span>{program.duration}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                          style={{ width: `${program.completion}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{program.completion}%</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {program.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Popular Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Popular Courses
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Advanced JavaScript', enrolled: 32 },
              { name: 'Project Management Fundamentals', enrolled: 28 },
              { name: 'Effective Communication', enrolled: 25 },
              { name: 'Data Analytics', enrolled: 22 }
            ].map((course, index) => (
              <div key={index} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpenIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{course.name}</span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{course.enrolled} enrolled</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Training Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Completion Rate</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">78%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Average Score</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">4.2/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Active Learners</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">89</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRTraining;

