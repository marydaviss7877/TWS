import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FingerPrintIcon, 
  FaceSmileIcon,
  MicrophoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import BiometricAuth from './BiometricAuth';

const BiometricEnrollment = () => {
  const { user } = useAuth();
  const [enrolledBiometrics, setEnrolledBiometrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedBiometricType, setSelectedBiometricType] = useState('fingerprint');
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);

  useEffect(() => {
    fetchEnrolledBiometrics();
    checkEnrollmentStatus();
  }, []);

  const fetchEnrolledBiometrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/biometric-enrollment/my-biometrics');
      setEnrolledBiometrics(response.data.data.biometrics);
    } catch (error) {
      console.error('Error fetching biometrics:', error);
      toast.error('Failed to fetch enrolled biometrics');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const response = await axios.get('/api/biometric-enrollment/enrollment-status');
      setEnrollmentStatus(response.data.data);
    } catch (error) {
      console.error('Error checking enrollment status:', error);
    }
  };

  const handleBiometricEnrollment = async (biometricData) => {
    try {
      setLoading(true);
      
      const enrollmentData = {
        biometricData: {
          ...biometricData,
          type: selectedBiometricType
        }
      };

      const response = await axios.post('/api/biometric-enrollment/enroll', enrollmentData);
      
      if (response.data.success) {
        toast.success(`${selectedBiometricType} enrolled successfully!`);
        setShowEnrollmentModal(false);
        fetchEnrolledBiometrics();
        checkEnrollmentStatus();
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error(error.response?.data?.message || 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricVerification = async (biometricData) => {
    try {
      setLoading(true);
      
      const verificationData = {
        biometricData: {
          ...biometricData,
          type: selectedBiometricType
        }
      };

      const response = await axios.post('/api/biometric-enrollment/verify', verificationData);
      
      if (response.data.success) {
        toast.success(`${selectedBiometricType} verified successfully!`);
        setShowEnrollmentModal(false);
        fetchEnrolledBiometrics();
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBiometric = async (templateId, biometricType) => {
    if (!window.confirm(`Are you sure you want to delete your ${biometricType} biometric?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(`/api/biometric-enrollment/delete/${templateId}`);
      
      if (response.data.success) {
        toast.success(`${biometricType} biometric deleted successfully!`);
        fetchEnrolledBiometrics();
        checkEnrollmentStatus();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete biometric');
    } finally {
      setLoading(false);
    }
  };

  const openEnrollmentModal = (type) => {
    setSelectedBiometricType(type);
    setShowEnrollmentModal(true);
  };

  const getBiometricIcon = (type) => {
    switch (type) {
      case 'fingerprint':
        return <FingerPrintIcon className="h-6 w-6" />;
      case 'face':
        return <FaceSmileIcon className="h-6 w-6" />;
      case 'voice':
        return <MicrophoneIcon className="h-6 w-6" />;
      default:
        return <ShieldCheckIcon className="h-6 w-6" />;
    }
  };

  const getBiometricStatusColor = (biometric) => {
    if (biometric.isExpired) return 'text-red-600';
    if (biometric.isLockedOut) return 'text-yellow-600';
    if (biometric.status === 'active') return 'text-green-600';
    return 'text-gray-600';
  };

  const getBiometricStatusText = (biometric) => {
    if (biometric.isExpired) return 'Expired';
    if (biometric.isLockedOut) return 'Locked';
    if (biometric.status === 'active') return 'Active';
    return 'Inactive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Biometric Enrollment</h2>
            <p className="text-gray-600 mt-1">
              Enroll your biometrics for secure attendance verification
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              {enrollmentStatus?.enrollmentComplete ? 'Fully Enrolled' : 'Partial Enrollment'}
            </span>
          </div>
        </div>
      </div>

      {/* Enrollment Status */}
      {enrollmentStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Enrollment Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {enrollmentStatus.enrolledTypes.length}
              </div>
              <div className="text-sm text-blue-700">Enrolled Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {enrollmentStatus.missingTypes.length}
              </div>
              <div className="text-sm text-blue-700">Missing Types</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${enrollmentStatus.hasAllRequired ? 'text-green-600' : 'text-yellow-600'}`}>
                {enrollmentStatus.hasAllRequired ? 'Complete' : 'Incomplete'}
              </div>
              <div className="text-sm text-blue-700">Status</div>
            </div>
          </div>
        </div>
      )}

      {/* Available Biometric Types */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Biometric Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fingerprint */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FingerPrintIcon className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-gray-900">Fingerprint</span>
              </div>
              {enrolledBiometrics.find(b => b.type === 'fingerprint') ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Use your device's fingerprint sensor for secure authentication
            </p>
            <button
              onClick={() => openEnrollmentModal('fingerprint')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {enrolledBiometrics.find(b => b.type === 'fingerprint') ? 'Re-enroll' : 'Enroll'}
            </button>
          </div>

          {/* Face Recognition */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaceSmileIcon className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-gray-900">Face Recognition</span>
              </div>
              {enrolledBiometrics.find(b => b.type === 'face') ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Use your device's camera for face recognition authentication
            </p>
            <button
              onClick={() => openEnrollmentModal('face')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {enrolledBiometrics.find(b => b.type === 'face') ? 'Re-enroll' : 'Enroll'}
            </button>
          </div>

          {/* Voice Recognition */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MicrophoneIcon className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-gray-900">Voice Recognition</span>
              </div>
              {enrolledBiometrics.find(b => b.type === 'voice') ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Use your voice for secure voice-based authentication
            </p>
            <button
              onClick={() => openEnrollmentModal('voice')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {enrolledBiometrics.find(b => b.type === 'voice') ? 'Re-enroll' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>

      {/* Enrolled Biometrics */}
      {enrolledBiometrics.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Enrolled Biometrics</h3>
          <div className="space-y-3">
            {enrolledBiometrics.map((biometric) => (
              <div key={biometric.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getBiometricIcon(biometric.type)}
                  <div>
                    <div className="font-medium text-gray-900 capitalize">
                      {biometric.type} Authentication
                    </div>
                    <div className="text-sm text-gray-600">
                      Enrolled: {new Date(biometric.enrollmentDate).toLocaleDateString()}
                    </div>
                    {biometric.lastUsed && (
                      <div className="text-sm text-gray-600">
                        Last used: {new Date(biometric.lastUsed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getBiometricStatusColor(biometric)}`}>
                      {getBiometricStatusText(biometric)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {Math.round(biometric.confidence * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Quality: {biometric.quality}%
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEnrollmentModal(biometric.type)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Update biometric"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBiometric(biometric.id, biometric.type)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete biometric"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {enrolledBiometrics.find(b => b.type === selectedBiometricType) 
                  ? `Update ${selectedBiometricType} Authentication` 
                  : `Enroll ${selectedBiometricType} Authentication`}
              </h3>
              <button
                onClick={() => setShowEnrollmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <BiometricAuth
              type={selectedBiometricType}
              onSuccess={(data) => {
                if (enrolledBiometrics.find(b => b.type === selectedBiometricType)) {
                  handleBiometricVerification(data);
                } else {
                  handleBiometricEnrollment(data);
                }
              }}
              onError={(error) => {
                console.error('Biometric error:', error);
                toast.error('Biometric operation failed');
              }}
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiometricEnrollment;
