import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
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
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import TeamCollaboration from './TeamCollaboration';
import ProductivityAnalytics from './ProductivityAnalytics';

const SoftwareHouseAttendance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin');
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
      getCurrentLocation();
      fetchTodayStats();
      fetchTeamActivity();
      fetchSprintProgress();
    }
  }, [user]);

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
      const response = await axios.get('/api/attendance/team/activity');
      if (response.data.success) {
        setTeamActivity(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team activity:', error);
    }
  };

  const fetchSprintProgress = async () => {
    try {
      const response = await axios.get('/api/attendance/sprint/progress');
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
    if (!location) {
      toast.error('Location is required for check-in');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/software-house/checkin', {
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
        fetchTodayStats();
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
      const response = await axios.post('/api/attendance/software-house/checkout', {
        location,
        photoUrl: photo,
        biometricData,
        notes,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Checked out successfully! Great work today! 🎉');
        fetchTodayStats();
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
        const response = await axios.post(`/api/attendance/break/end/${breaks.length - 1}`);
        
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
      const response = await axios.post('/api/attendance/focus-mode/toggle', {
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
      case 'hybrid': return 'bg-accent-100 text-accent-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'away': return 'bg-gray-100 text-gray-800';
      case 'focus': return 'bg-accent-100 text-accent-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'checkin', name: 'Check In/Out', icon: ClockIcon },
    { id: 'team', name: 'Team Collaboration', icon: UserGroupIcon },
    { id: 'analytics', name: 'Productivity Analytics', icon: ChartBarIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-primary-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-accent-600 bg-clip-text text-transparent">
                Developer Hub
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Modern attendance tracking for software teams
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sprint Progress</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sprintProgress.velocity}%
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CodeBracketIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
            <nav className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-accent-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'checkin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Check-in/Out Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Check-in/Out Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-accent-600 mb-6 shadow-lg">
                  <ClockIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to Code?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  Start your productive day with a simple check-in
                </p>

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
                  <button
                    onClick={handleCheckIn}
                    disabled={loading || !location}
                    className="inline-flex items-center px-12 py-4 border border-transparent text-lg font-medium rounded-2xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-accent-600 hover:from-blue-700 hover:to-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? (
                      <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    ) : (
                      <RocketLaunchIcon className="h-6 w-6 mr-3" />
                    )}
                    Start Coding Session
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Productivity Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
                Today's Productivity
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TimeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {todayStats.totalHours}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <LightBulbIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {todayStats.productiveHours}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Productive</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <CodeBracketIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {todayStats.codeCommits}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrophyIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {todayStats.tasksCompleted}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Done</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sprint Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-accent-600" />
                Focus Mode
              </h3>
              <div className="text-center">
                <button
                  onClick={toggleFocusMode}
                  className={`w-full py-4 px-6 rounded-2xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    focusMode
                      ? 'bg-gradient-to-r from-accent-600 to-accent-700 text-white shadow-lg'
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
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                Team Activity
              </h3>
              <div className="space-y-3">
                {teamActivity.slice(0, 5).map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-accent-600 flex items-center justify-center text-white text-sm font-bold mr-3">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
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
                <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all duration-200">
                  <BellIcon className="h-5 w-5 mr-2" />
                  Set Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'team' && (
          <TeamCollaboration />
        )}

        {activeTab === 'analytics' && (
          <ProductivityAnalytics />
        )}

        {/* Hidden video and canvas elements for photo capture */}
        <video ref={videoRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default SoftwareHouseAttendance;
