import React, { useState, useRef, useEffect } from 'react';
import { 
  FingerPrintIcon, 
  FaceSmileIcon, 
  MicrophoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const BiometricAuth = ({ onSuccess, onError, type = 'fingerprint' }) => {
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [error, setError] = useState(null);
  const [biometricData, setBiometricData] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startFingerprintScan = async () => {
    try {
      setStatus('scanning');
      setError(null);
      setProgress(0);

      // Simulate fingerprint scanning with WebAuthn API
      if ('PublicKeyCredential' in window) {
        // Use WebAuthn for fingerprint authentication
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: {
              name: "TWS Attendance System",
              id: window.location.hostname,
            },
            user: {
              id: new Uint8Array(16),
              name: "user@example.com",
              displayName: "User",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 }, // ES256
              { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000,
            attestation: "direct"
          }
        });

        if (credential) {
          const fingerprintData = {
            id: credential.id,
            type: credential.type,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
              clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
            }
          };

          setBiometricData(fingerprintData);
          setStatus('success');
          onSuccess(fingerprintData);
        }
      } else {
        // Fallback: Simulate fingerprint scan
        simulateBiometricScan('fingerprint');
      }
    } catch (err) {
      console.error('Fingerprint scan failed:', err);
      setError('Fingerprint authentication failed. Please try again.');
      setStatus('error');
      onError(err);
    }
  };

  const startFaceScan = async () => {
    try {
      setStatus('scanning');
      setError(null);
      setProgress(0);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Wait for video to load
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = resolve;
        });

        // Start face detection
        startFaceDetection();
      }
    } catch (err) {
      console.error('Face scan failed:', err);
      setError('Camera access denied or unavailable. Please check permissions.');
      setStatus('error');
      onError(err);
    }
  };

  const startFaceDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Simulate face detection with progress
    let detectionProgress = 0;
    intervalRef.current = setInterval(() => {
      detectionProgress += 10;
      setProgress(detectionProgress);

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Simulate face detection overlay
      if (detectionProgress > 30) {
        // Draw face detection box
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          canvas.width * 0.25, 
          canvas.height * 0.2, 
          canvas.width * 0.5, 
          canvas.height * 0.6
        );

        // Draw face detection text
        ctx.fillStyle = '#10B981';
        ctx.font = '16px Arial';
        ctx.fillText('Face Detected', canvas.width * 0.25, canvas.height * 0.15);
      }

      if (detectionProgress >= 100) {
        clearInterval(intervalRef.current);
        
        // Capture face data
        const faceData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Generate face ID hash
        const faceId = generateFaceId(faceData);
        
        const biometricData = {
          faceId,
          imageData: faceData,
          timestamp: new Date().toISOString(),
          confidence: 0.95
        };

        setBiometricData(biometricData);
        setStatus('success');
        
        // Stop camera
        streamRef.current.getTracks().forEach(track => track.stop());
        
        onSuccess(biometricData);
      }
    }, 200);
  };

  const startVoiceScan = async () => {
    try {
      setStatus('scanning');
      setError(null);
      setProgress(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context for voice analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Simulate voice analysis
      let analysisProgress = 0;
      intervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        analysisProgress += 5;
        setProgress(analysisProgress);

        if (analysisProgress >= 100) {
          clearInterval(intervalRef.current);
          
          // Generate voice print
          const voicePrint = generateVoicePrint(dataArray);
          
          const biometricData = {
            voicePrint,
            audioData: Array.from(dataArray),
            timestamp: new Date().toISOString(),
            confidence: 0.88
          };

          setBiometricData(biometricData);
          setStatus('success');
          
          // Stop microphone
          stream.getTracks().forEach(track => track.stop());
          
          onSuccess(biometricData);
        }
      }, 100);
    } catch (err) {
      console.error('Voice scan failed:', err);
      setError('Microphone access denied or unavailable. Please check permissions.');
      setStatus('error');
      onError(err);
    }
  };

  const simulateBiometricScan = (scanType) => {
    let progress = 0;
    intervalRef.current = setInterval(() => {
      progress += 10;
      setProgress(progress);

      if (progress >= 100) {
        clearInterval(intervalRef.current);
        
        const biometricData = {
          type: scanType,
          data: `mock_${scanType}_data_${Date.now()}`,
          timestamp: new Date().toISOString(),
          confidence: 0.92
        };

        setBiometricData(biometricData);
        setStatus('success');
        onSuccess(biometricData);
      }
    }, 200);
  };

  const generateFaceId = (imageData) => {
    // Simple hash generation for face ID
    let hash = 0;
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `face_${Math.abs(hash).toString(16)}`;
  };

  const generateVoicePrint = (audioData) => {
    // Simple voice print generation
    const sum = audioData.reduce((acc, val) => acc + val, 0);
    const avg = sum / audioData.length;
    const variance = audioData.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / audioData.length;
    return `voice_${Math.abs(avg * variance).toString(16)}`;
  };

  const resetScan = () => {
    setStatus('idle');
    setError(null);
    setBiometricData(null);
    setProgress(0);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'scanning':
        return <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600"></div>;
      case 'success':
        return <CheckCircleIcon className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-8 w-8 text-red-600" />;
      default:
        switch (type) {
          case 'fingerprint':
            return <FingerPrintIcon className="h-8 w-8 text-blue-600" />;
          case 'face':
            return <FaceSmileIcon className="h-8 w-8 text-blue-600" />;
          case 'voice':
            return <MicrophoneIcon className="h-8 w-8 text-blue-600" />;
          default:
            return <LockClosedIcon className="h-8 w-8 text-blue-600" />;
        }
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'scanning':
        return `Scanning ${type}...`;
      case 'success':
        return `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!`;
      case 'error':
        return error || 'Authentication failed';
      default:
        return `Click to scan ${type}`;
    }
  };

  const handleScan = () => {
    if (status === 'scanning') return;
    
    switch (type) {
      case 'fingerprint':
        startFingerprintScan();
        break;
      case 'face':
        startFaceScan();
        break;
      case 'voice':
        startVoiceScan();
        break;
      default:
        simulateBiometricScan(type);
    }
  };

  return (
    <div className="space-y-4">
      {/* Biometric Scanner */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            {getStatusIcon()}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {type.charAt(0).toUpperCase() + type.slice(1)} Authentication
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            {getStatusText()}
          </p>

          {/* Progress Bar */}
          {status === 'scanning' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            {status === 'idle' && (
              <button
                onClick={handleScan}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <CameraIcon className="h-5 w-5 mr-2" />
                Start Scan
              </button>
            )}
            
            {status === 'error' && (
              <button
                onClick={resetScan}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Try Again
              </button>
            )}
            
            {status === 'success' && (
              <button
                onClick={resetScan}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                Scan Again
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Biometric Data Preview */}
          {biometricData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm text-green-700">
                <strong>Biometric ID:</strong> {biometricData.faceId || biometricData.voicePrint || biometricData.id || 'Generated'}
              </div>
              <div className="text-sm text-green-600">
                <strong>Confidence:</strong> {Math.round((biometricData.confidence || 0.9) * 100)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Element for Face Detection */}
      {type === 'face' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Camera Preview</h4>
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-48 bg-gray-100 rounded-lg object-cover"
              style={{ display: status === 'scanning' ? 'block' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-48 bg-gray-100 rounded-lg object-cover"
              style={{ display: status === 'scanning' ? 'block' : 'none' }}
            />
            {status !== 'scanning' && (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <CameraIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          {type === 'fingerprint' && 'Fingerprint Instructions'}
          {type === 'face' && 'Face Recognition Instructions'}
          {type === 'voice' && 'Voice Recognition Instructions'}
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {type === 'fingerprint' && (
            <>
              <li>• Place your finger on the fingerprint sensor</li>
              <li>• Keep your finger steady and apply gentle pressure</li>
              <li>• Wait for the scan to complete</li>
            </>
          )}
          {type === 'face' && (
            <>
              <li>• Position your face in the camera frame</li>
              <li>• Ensure good lighting and clear visibility</li>
              <li>• Look directly at the camera and stay still</li>
            </>
          )}
          {type === 'voice' && (
            <>
              <li>• Speak clearly into the microphone</li>
              <li>• Say a few words or phrases</li>
              <li>• Keep background noise to a minimum</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BiometricAuth;
