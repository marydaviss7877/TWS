import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import { useSocket } from '../../../../app/providers/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  MapPinIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  FingerPrintIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  CodeBracketIcon,
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  WifiIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  SparklesIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  HeartIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon as TimeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  Cog6ToothIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UserIcon,
  IdentificationIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const EmployeeCheckInOut = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [biometricData, setBiometricData] = useState({
    fingerprint: null,
    faceId: null,
    voicePrint: null
  });
  const [currentBreak, setCurrentBreak] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [notes, setNotes] = useState('');
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [selectedBiometricType, setSelectedBiometricType] = useState('fingerprint');
  const [workMode, setWorkMode] = useState('office'); // office, remote, hybrid
  const [focusMode, setFocusMode] = useState(false);
  const [currentProject, setCurrentProject] = useState('');
  const [teamStatus, setTeamStatus] = useState('available'); // available, busy, away, focus
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [showEmployeeIdModal, setShowEmployeeIdModal] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalHours: 0,
    productiveHours: 0,
    breakTime: 0,
    focusTime: 0,
    codeCommits: 0,
    tasksCompleted: 0,
    collaborationScore: 0
  });
  const [teamActivity, setTeamActivity] = useState([]);
  const [sprintProgress, setSprintProgress] = useState({
    currentSprint: 'Sprint 24.1',
    daysRemaining: 5,
    tasksCompleted: 12,
    totalTasks: 20,
    velocity: 85
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user) {
      setEmployeeId(user.employeeId || '');
      getCurrentLocation();
      fetchTodayAttendance();
      fetchTodayStats();
      fetchTeamActivity();
      fetchSprintProgress();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      // Listen for real-time attendance updates
      socket.on('attendanceUpdate', (data) => {
        if (data.userId === user?._id) {
          fetchTodayAttendance();
          fetchTodayStats();
        }
      });

      // Listen for admin notifications
      socket.on('adminNotification', (data) => {
        if (data.type === 'attendance') {
          toast.info(data.message);
        }
      });

      return () => {
        socket.off('attendanceUpdate');
        socket.off('adminNotification');
      };
    }
  }, [socket, user]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=YOUR_API_KEY`
            );
            const data = await response.json();
            
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              address: data.results?.[0]?.formatted || 'Current Location'
            });
          } catch (error) {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              address: 'Location detected'
            });
          }
        },
        (error) => {
          console.warn('Location access denied or unavailable:', error.message);
          setLocation({
            latitude: null,
            longitude: null,
            address: 'Location not available'
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await axios.get('/api/attendance/today');
      if (response.data.success) {
        setTodayAttendance(response.data.data.attendance);
        setBreaks(response.data.data.attendance?.breakTime || []);
      }
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await axios.get('/api/attendance/software-house/stats');
      if (response.data.success) {
        setTodayStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch today stats:', error);
    }
  };

  const fetchTeamActivity = async () => {
    try {
      const response = await axios.get('/api/attendance/software-house/team/activity');
      if (response.data.success) {
        setTeamActivity(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team activity:', error);
    }
  };

  const fetchSprintProgress = async () => {
    try {
      const response = await axios.get('/api/attendance/software-house/sprint/progress');
      if (response.data.success) {
        setSprintProgress(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sprint progress:', error);
    }
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = resolve;
        });
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoDataUrl);
        
        stream.getTracks().forEach(track => track.stop());
        toast.success('Photo captured successfully!');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const handleCheckIn = async () => {
    if (!employeeId) {
      setShowEmployeeIdModal(true);
      return;
    }

    if (!location) {
      toast.error('Location is required for check-in');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/checkin', {
        employeeId,
        location,
        photoUrl: photo,
        biometricData,
        workMode,
        currentProject,
        teamStatus,
        notes,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Checked in successfully! 🚀');
        fetchTodayAttendance();
        fetchTodayStats();
        
        // Notify admin panel via socket
        if (socket) {
          socket.emit('attendanceCheckIn', {
            userId: user._id,
            employeeId,
            timestamp: new Date(),
            location,
            workMode,
            currentProject
          });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/checkout', {
        employeeId,
        location,
        photoUrl: photo,
        biometricData,
        notes,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Checked out successfully! Great work today! 🎉');
        fetchTodayAttendance();
        fetchTodayStats();
        
        // Notify admin panel via socket
        if (socket) {
          socket.emit('attendanceCheckOut', {
            userId: user._id,
            employeeId,
            timestamp: new Date(),
            location
          });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      const response = await axios.post('/api/attendance/break/start', {
        employeeId,
        type: 'break',
        location,
        notes: 'Break time',
        workMode
      });

      if (response.data.success) {
        setCurrentBreak(response.data.data.breakEntry);
        toast.success('Break started! Take a well-deserved rest ☕');
        fetchTodayStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    if (currentBreak) {
      try {
        const response = await axios.post(`/api/attendance/break/end/${breaks.length - 1}`, {
          employeeId
        });
        
        if (response.data.success) {
          setCurrentBreak(null);
          toast.success('Break ended! Back to coding! 💻');
          fetchTodayStats();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to end break');
      }
    }
  };

  const toggleFocusMode = async () => {
    try {
      const response = await axios.post('/api/attendance/software-house/focus-mode/toggle', {
        employeeId,
        enabled: !focusMode,
        project: currentProject
      });

      if (response.data.success) {
        setFocusMode(!focusMode);
        setTeamStatus(focusMode ? 'available' : 'focus');
        toast.success(focusMode ? 'Focus mode disabled' : 'Focus mode enabled! Deep work time 🧠');
        fetchTodayStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle focus mode');
    }
  };

  const getWorkModeIcon = (mode) => {
    switch (mode) {
      case 'office': return BuildingOfficeIcon;
      case 'remote': return HomeIcon;
      case 'hybrid': return WifiIcon;
      default: return ComputerDesktopIcon;
    }
  };

  const getWorkModeColor = (mode) => {
    switch (mode) {
      case 'office': return 'bg-blue-100 text-blue-800';
      case 'remote': return 'bg-green-100 text-green-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'away': return 'bg-gray-100 text-gray-800';
      case 'focus': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isCheckedIn = todayAttendance?.checkIn?.timestamp;
  const isCheckedOut = todayAttendance?.checkOut?.timestamp;
  const hasActiveBreak = breaks.some(breakItem => !breakItem.endTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Employee Check-In/Out
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Secure attendance tracking with Employee ID verification
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Employee ID</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employeeId || 'Not Set'}
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <IdentificationIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Check-in/Out Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Check-in/Out Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
                  <ClockIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {isCheckedIn ? 'Check Out' : 'Check In'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {isCheckedIn 
                    ? 'You are currently checked in. Click below to check out.'
                    : 'Click below to check in for the day.'
                  }
                </p>

                {/* Employee ID Display */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Employee ID:</span>
                    <span className="ml-2 font-bold text-gray-900 dark:text-white">
                      {employeeId || 'Not Set'}
                    </span>
                    {!employeeId && (
                      <button
                        onClick={() => setShowEmployeeIdModal(true)}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Set ID
                      </button>
                    )}
                  </div>
                </div>

                {/* Work Mode Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Work Mode
                  </label>
                  <div className="flex justify-center space-x-3">
                    {['office', 'remote', 'hybrid'].map((mode) => {
                      const Icon = getWorkModeIcon(mode);
                      return (
                        <button
                          key={mode}
                          onClick={() => setWorkMode(mode)}
                          className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
                            workMode === mode
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <Icon className="h-5 w-5 mr-2" />
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location Status */}
                <div className="flex items-center justify-center mb-6">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {location ? location.address : 'Getting location...'}
                  </span>
                  {location && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </div>

                {/* Project Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Project
                  </label>
                  <select
                    value={currentProject}
                    onChange={(e) => setCurrentProject(e.target.value)}
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a project...</option>
                    <option value="mobile-app">Mobile App Development</option>
                    <option value="web-platform">Web Platform</option>
                    <option value="api-services">API Services</option>
                    <option value="data-analytics">Data Analytics</option>
                    <option value="devops">DevOps & Infrastructure</option>
                    <option value="research">Research & Development</option>
                  </select>
                </div>

                {/* Team Status */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Status
                  </label>
                  <div className="flex justify-center space-x-2">
                    {['available', 'busy', 'away', 'focus'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setTeamStatus(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          teamStatus === status
                            ? getTeamStatusColor(status)
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Capture */}
                <div className="mb-6">
                  <button
                    onClick={capturePhoto}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <CameraIcon className="h-5 w-5 mr-2" />
                    {photo ? 'Photo Captured ✓' : 'Capture Photo'}
                  </button>
                </div>

                {/* Notes */}
                <div className="mb-8">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What are you working on today? (optional)"
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>

                {/* Check In/Out Button */}
                <div className="mb-6">
                  {!isCheckedIn ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={loading || !location || !employeeId}
                      className="inline-flex items-center px-12 py-4 border border-transparent text-lg font-medium rounded-2xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                      {loading ? (
                        <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      ) : (
                        <RocketLaunchIcon className="h-6 w-6 mr-3" />
                      )}
                      Check In
                    </button>
                  ) : !isCheckedOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={loading}
                      className="inline-flex items-center px-12 py-4 border border-transparent text-lg font-medium rounded-2xl shadow-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                      {loading ? (
                        <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      ) : (
                        <XCircleIcon className="h-6 w-6 mr-3" />
                      )}
                      Check Out
                    </button>
                  ) : (
                    <div className="text-green-600 font-medium">
                      <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
                      All done for today!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Break Management */}
            {isCheckedIn && !isCheckedOut && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <PauseIcon className="h-6 w-6 mr-2 text-orange-600" />
                  Break Management
                </h3>
                
                <div className="flex items-center justify-center space-x-4 mb-6">
                  {!hasActiveBreak ? (
                    <button
                      onClick={handleStartBreak}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Break
                    </button>
                  ) : (
                    <button
                      onClick={handleEndBreak}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <PauseIcon className="h-5 w-5 mr-2" />
                      End Break
                    </button>
                  )}
                </div>

                {/* Break History */}
                {breaks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Today's Breaks</h4>
                    <div className="space-y-2">
                      {breaks.map((breakItem, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {breakItem.type.charAt(0).toUpperCase() + breakItem.type.slice(1)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(breakItem.startTime).toLocaleTimeString()} - 
                              {breakItem.endTime ? new Date(breakItem.endTime).toLocaleTimeString() : ' Ongoing'}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {breakItem.durationMinutes ? `${breakItem.durationMinutes}m` : 'Active'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Today's Status */}
            {todayAttendance && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-green-600" />
                  Today's Status
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Check In</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {todayAttendance.checkIn?.timestamp 
                        ? new Date(todayAttendance.checkIn.timestamp).toLocaleTimeString()
                        : 'Not checked in'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Check Out</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {todayAttendance.checkOut?.timestamp 
                        ? new Date(todayAttendance.checkOut.timestamp).toLocaleTimeString()
                        : 'Not checked out'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {todayAttendance.durationMinutes 
                        ? `${Math.floor(todayAttendance.durationMinutes / 60)}h ${todayAttendance.durationMinutes % 60}m`
                        : 'N/A'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Quality Score</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {todayAttendance.qualityScore || 100}%
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sprint Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-green-600" />
                Sprint Progress
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{sprintProgress.currentSprint}</span>
                    <span>{sprintProgress.daysRemaining} days left</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${sprintProgress.velocity}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>{sprintProgress.tasksCompleted}/{sprintProgress.totalTasks} tasks</span>
                    <span>{sprintProgress.velocity}% complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Focus Mode */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                Focus Mode
              </h3>
              <div className="text-center">
                <button
                  onClick={toggleFocusMode}
                  className={`w-full py-4 px-6 rounded-2xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    focusMode
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  {focusMode 
                    ? 'Deep work time - notifications muted' 
                    : 'Enable for distraction-free coding'
                  }
                </p>
              </div>
            </div>

            {/* Team Activity */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                Team Activity
              </h3>
              <div className="space-y-3">
                {teamActivity.slice(0, 5).map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {member.project}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamStatusColor(member.status)}`}>
                      {member.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Log Time Entry
                </button>
                <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  Team Standup
                </button>
                <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200">
                  <BellIcon className="h-5 w-5 mr-2" />
                  Set Reminder
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Employee ID Modal */}
        {showEmployeeIdModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Employee ID
                </h3>
                <button
                  onClick={() => setShowEmployeeIdModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your Employee ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmployeeIdModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (employeeId) {
                      setShowEmployeeIdModal(false);
                      toast.success('Employee ID set successfully!');
                    } else {
                      toast.error('Please enter a valid Employee ID');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden video and canvas elements for photo capture */}
        <video ref={videoRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default EmployeeCheckInOut;
