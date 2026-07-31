import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AttendanceCalendar = ({ userId, isAdmin = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateData, setSelectedDateData] = useState(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [currentDate, userId]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await axios.get(`/api/attendance/calendar`, {
        params: {
          year,
          month,
          userId: isAdmin ? undefined : userId
        }
      });
      
      if (response.data.success) {
        setAttendanceData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAttendanceStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceData[dateStr] || null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
      case 'on_time':
        return 'bg-green-500 hover:bg-green-600';
      case 'late':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'absent':
        return 'bg-red-500 hover:bg-red-600';
      case 'half_day':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-200 hover:bg-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
      case 'on_time':
        return <CheckCircleIcon className="h-3 w-3 text-white" />;
      case 'late':
        return <ClockIcon className="h-3 w-3 text-white" />;
      case 'absent':
        return <XCircleIcon className="h-3 w-3 text-white" />;
      case 'half_day':
        return <ExclamationTriangleIcon className="h-3 w-3 text-white" />;
      default:
        return null;
    }
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const attendance = attendanceData[dateStr];
    
    setSelectedDate(date);
    setSelectedDateData(attendance);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-xl font-bold text-gray-900">Attendance Calendar</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900 min-w-32 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">On Time</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">Late</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">Absent</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">Half Day</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
          <span className="text-sm text-gray-700">No Record</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="h-12"></div>;
          }

          const attendance = getAttendanceStatus(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                h-12 relative rounded-lg transition-all duration-200 flex flex-col items-center justify-center
                ${attendance ? getStatusColor(attendance.status) : 'bg-gray-200 hover:bg-gray-300'}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
                ${day > new Date() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={day > new Date()}
            >
              <span className={`text-sm font-medium ${attendance ? 'text-white' : 'text-gray-700'}`}>
                {day.getDate()}
              </span>
              {attendance && (
                <div className="absolute top-1 right-1">
                  {getStatusIcon(attendance.status)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
          
          {selectedDateData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedDateData.status === 'present' || selectedDateData.status === 'on_time' ? 'text-green-600 bg-green-100' :
                    selectedDateData.status === 'late' ? 'text-yellow-600 bg-yellow-100' :
                    selectedDateData.status === 'absent' ? 'text-red-600 bg-red-100' :
                    selectedDateData.status === 'half_day' ? 'text-blue-600 bg-blue-100' :
                    'text-gray-600 bg-gray-100'
                  }`}>
                    {getStatusIcon(selectedDateData.status)}
                    <span className="ml-1 capitalize">{selectedDateData.status}</span>
                  </span>
                </div>
              </div>
              
              {selectedDateData.checkIn && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check In</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedDateData.checkIn.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
              
              {selectedDateData.checkOut && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check Out</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedDateData.checkOut.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
              
              {selectedDateData.durationMinutes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDuration(selectedDateData.durationMinutes)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No attendance record for this date</p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading calendar...</span>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
