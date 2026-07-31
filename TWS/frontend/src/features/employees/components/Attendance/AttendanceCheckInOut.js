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
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import BiometricAuth from './BiometricAuth';

const AttendanceCheckInOut = ({ todayAttendance, onAttendanceUpdate }) => {
  const { user } = useAuth();
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
  const [biometricType, setBiometricType] = useState('fingerprint');
  const [selectedBiometricType, setSelectedBiometricType] = useState('fingerprint');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user) {
      getCurrentLocation();
      fetchBreaks();
    }
  }, [user]);

  useEffect(() => {
    if (todayAttendance) {
      setBreaks(todayAttendance.breakTime || []);
    }
  }, [todayAttendance]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocoding to get address
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
        
        // Wait for video to load
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = resolve;
        });
        
        // Capture photo
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoDataUrl);
        
        // Stop video stream
        stream.getTracks().forEach(track => track.stop());
        
        toast.success('Photo captured successfully!');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const handleBiometricSuccess = async (data, type) => {
    try {
      // Verify biometric against stored templates
      const verificationData = {
        biometricData: {
          ...data,
          type: type
        }
      };

      const response = await axios.post('/api/biometric-enrollment/verify', verificationData);
      
      if (response.data.success) {
        const biometricUpdate = {};
        biometricUpdate[type] = data;
        
        setBiometricData(prev => ({ ...prev, ...biometricUpdate }));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!`);
      } else {
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} verification failed`);
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      toast.error(error.response?.data?.message || `${type} verification failed`);
    }
  };

  const handleBiometricError = (error, type) => {
    console.error(`Error capturing ${type}:`, error);
    toast.error(`Failed to capture ${type}. Please try again.`);
  };

  const openBiometricModal = (type) => {
    setSelectedBiometricType(type);
    setShowBiometricModal(true);
  };

  const handleCheckIn = async () => {
    if (!location) {
      toast.error('Location is required for check-in');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/checkin', {
        location,
        photoUrl: photo,
        biometricData,
        notes,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Checked in successfully!');
        onAttendanceUpdate();
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
        location,
        photoUrl: photo,
        biometricData,
        notes,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        toast.success('Checked out successfully!');
        onAttendanceUpdate();
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
        notes: 'Break time'
      });

      if (response.data.success) {
        setCurrentBreak(response.data.data.breakEntry);
        toast.success('Break started!');
        fetchBreaks();
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
          toast.success('Break ended!');
          fetchBreaks();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to end break');
      }
    }
  };

  const fetchBreaks = async () => {
    try {
      const response = await axios.get('/api/attendance/today');
      if (response.data.success && response.data.data.attendance) {
        setBreaks(response.data.data.attendance.breakTime || []);
      }
    } catch (error) {
      console.error('Failed to fetch breaks:', error);
    }
  };

  const isCheckedIn = todayAttendance?.checkIn?.timestamp;
  const isCheckedOut = todayAttendance?.checkOut?.timestamp;
  const hasActiveBreak = breaks.some(breakItem => !breakItem.endTime);

  return (
    <div className="space-y-6">
      {/* Check In/Out Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <ClockIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {isCheckedIn 
              ? 'You are currently checked in. Click below to check out.'
              : 'Click below to check in for the day.'
            }
          </p>

          {/* Location Status */}
          <div className="flex items-center justify-center mb-4">
            <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {location ? location.address : 'Getting location...'}
            </span>
            {location && (
              <span className="ml-2 text-xs text-green-600">✓</span>
            )}
          </div>

          {/* Photo Capture */}
          <div className="mb-4">
            <button
              onClick={capturePhoto}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              {photo ? 'Photo Captured ✓' : 'Capture Photo'}
            </button>
          </div>

          {/* Biometric Options */}
          <div className="mb-4 flex justify-center space-x-2">
            <button
              onClick={() => openBiometricModal('fingerprint')}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md transition-colors ${
                biometricData.fingerprint 
                  ? 'border-green-300 bg-green-50 text-green-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FingerPrintIcon className="h-4 w-4 mr-1" />
              {biometricData.fingerprint ? 'Fingerprint ✓' : 'Fingerprint'}
            </button>
            <button
              onClick={() => openBiometricModal('face')}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md transition-colors ${
                biometricData.faceId 
                  ? 'border-green-300 bg-green-50 text-green-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaceSmileIcon className="h-4 w-4 mr-1" />
              {biometricData.faceId ? 'Face ID ✓' : 'Face ID'}
            </button>
            <button
              onClick={() => openBiometricModal('voice')}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md transition-colors ${
                biometricData.voicePrint 
                  ? 'border-green-300 bg-green-50 text-green-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MicrophoneIcon className="h-4 w-4 mr-1" />
              {biometricData.voicePrint ? 'Voice ✓' : 'Voice'}
            </button>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
            />
          </div>

          {/* Check In/Out Button */}
          <div className="mb-4">
            {!isCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={loading || !location}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="tws-loading-pulse rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                )}
                Check In
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="tws-loading-pulse rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <XCircleIcon className="h-5 w-5 mr-2" />
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Break Management</h3>
          
          <div className="flex items-center justify-center space-x-4">
            {!hasActiveBreak ? (
              <button
                onClick={handleStartBreak}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start Break
              </button>
            ) : (
              <button
                onClick={handleEndBreak}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PauseIcon className="h-5 w-5 mr-2" />
                End Break
              </button>
            )}
          </div>

          {/* Break History */}
          {breaks.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Today's Breaks</h4>
              <div className="space-y-2">
                {breaks.map((breakItem, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {breakItem.type.charAt(0).toUpperCase() + breakItem.type.slice(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(breakItem.startTime).toLocaleTimeString()} - 
                        {breakItem.endTime ? new Date(breakItem.endTime).toLocaleTimeString() : ' Ongoing'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Status</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Check In</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {todayAttendance.checkIn?.timestamp 
                  ? new Date(todayAttendance.checkIn.timestamp).toLocaleTimeString()
                  : 'Not checked in'
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Check Out</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {todayAttendance.checkOut?.timestamp 
                  ? new Date(todayAttendance.checkOut.timestamp).toLocaleTimeString()
                  : 'Not checked out'
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {todayAttendance.durationMinutes 
                  ? `${Math.floor(todayAttendance.durationMinutes / 60)}h ${todayAttendance.durationMinutes % 60}m`
                  : 'N/A'
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quality Score</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {todayAttendance.qualityScore || 100}%
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Hidden video and canvas elements for photo capture */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Biometric Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBiometricType.charAt(0).toUpperCase() + selectedBiometricType.slice(1)} Authentication
              </h3>
              <button
                onClick={() => setShowBiometricModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <BiometricAuth
              type={selectedBiometricType}
              onSuccess={(data) => {
                handleBiometricSuccess(data, selectedBiometricType);
                setShowBiometricModal(false);
              }}
              onError={(error) => {
                handleBiometricError(error, selectedBiometricType);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCheckInOut;
