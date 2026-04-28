import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const EmployeePerformanceView = ({ tenantSlug }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchPerformanceData();
  }, [tenantSlug, user]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch employee data
      const empResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${user.id}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        if (empData.data?.employees?.length > 0) {
          const employee = empData.data.employees[0];
          setPerformance({
            overallRating: 0,
            goals: [],
            competencies: []
          });
          setGoals([]);
        }
      }

      // Fetch performance reviews
      const reviewsResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/performance-reviews?employeeId=${user.id}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        const mappedReviews = (reviewsData.data?.reviews || []).map((review) => ({
          reviewType: 'Performance Review',
          reviewDate: review.date,
          rating: review.rating,
          feedback: review.note,
          reviewer: review.reviewedBy ? { name: review.reviewedBy.fullName || review.reviewedBy.email } : null
        }));
        setReviews(mappedReviews);
        if (mappedReviews.length > 0) {
          const ratings = mappedReviews
            .map((review) => Number(review.rating))
            .filter((value) => Number.isFinite(value) && value > 0);
          const overallRating = ratings.length > 0
            ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
            : 0;
          setPerformance((prev) => ({
            ...(prev || {}),
            overallRating
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      toast.error('Failed to load performance information');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 3.5) return 'text-blue-600 bg-blue-100';
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getGoalStatusColor = (status) => {
    const colors = {
      'completed': 'text-green-600 bg-green-100',
      'in-progress': 'text-blue-600 bg-blue-100',
      'not-started': 'text-gray-600 bg-gray-100',
      'on-hold': 'text-yellow-600 bg-yellow-100'
    };
    return colors[status] || colors['not-started'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900">My Performance</h2>
      </div>

      {/* Overall Rating */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 mb-2">Overall Performance Rating</p>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg ${getRatingColor(performance?.overallRating || 0)}`}>
                <span className="text-3xl font-bold">{performance?.overallRating?.toFixed(1) || 'N/A'}</span>
                <span className="text-lg ml-1">/ 5.0</span>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(performance?.overallRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-purple-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <TrophyIcon className="h-16 w-16 text-purple-200" />
        </div>
      </div>

      {/* Performance Goals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Goals</h3>
          <span className="text-sm text-gray-500">{goals.length} goals</span>
        </div>
        <div className="space-y-4">
          {goals.length > 0 ? (
            goals.map((goal, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{goal.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                    {goal.status?.replace('-', ' ')}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-gray-700">{goal.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  {goal.targetDate && (
                    <div className="ml-4 flex items-center text-xs text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No performance goals set</p>
          )}
        </div>
      </div>

      {/* Performance Reviews */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Reviews</h3>
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {review.reviewType || 'Annual Review'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {review.rating && (
                    <div className={`px-3 py-1 rounded-lg ${getRatingColor(review.rating)}`}>
                      <span className="font-bold">{review.rating.toFixed(1)}</span>
                      <span className="text-sm">/ 5.0</span>
                    </div>
                  )}
                </div>
                {review.feedback && (
                  <p className="text-sm text-gray-600 mb-3">{review.feedback}</p>
                )}
                {review.reviewer && (
                  <p className="text-xs text-gray-500">
                    Reviewed by: {review.reviewer.name || review.reviewer}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No performance reviews available</p>
          )}
        </div>
      </div>

      {/* Competencies */}
      {performance?.competencies && performance.competencies.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Competencies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performance.competencies.map((competency, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{competency.name}</h4>
                  <span className="text-sm font-medium text-gray-700">
                    {competency.level || 'N/A'}
                  </span>
                </div>
                {competency.rating && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(competency.rating / 5) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformanceView;
