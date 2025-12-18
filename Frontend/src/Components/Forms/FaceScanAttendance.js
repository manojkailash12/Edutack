import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';

const FaceScanAttendance = ({ onScanComplete, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' 
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startScan = () => {
    setIsScanning(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          performScan();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performScan = () => {
    // Capture image from video
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Convert to base64 for future face recognition processing
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Simulate face recognition processing
      setTimeout(() => {
        setIsScanning(false);
        toast.success('Face scan completed successfully!');
        onScanComplete({
          method: 'face-scan',
          imageData: imageData,
          timestamp: new Date().toISOString()
        });
      }, 1500);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-4">Face Scan Attendance</h2>
        
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-gray-200 rounded-lg object-cover"
          />
          
          {/* Overlay for scanning */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-4 border-blue-500 rounded-full w-48 h-48 flex items-center justify-center">
              {isScanning && countdown > 0 && (
                <div className="text-4xl font-bold text-blue-500">
                  {countdown}
                </div>
              )}
              {isScanning && countdown === 0 && (
                <div className="text-lg font-medium text-blue-500">
                  Scanning...
                </div>
              )}
              {!isScanning && (
                <div className="text-sm text-gray-600 text-center">
                  Position your face<br />within the circle
                </div>
              )}
            </div>
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="mt-6 flex gap-4 justify-center">
          {!isScanning && (
            <>
              <button
                onClick={startScan}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Start Face Scan
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </>
          )}
          
          {isScanning && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Processing face scan...</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          <p>• Ensure good lighting</p>
          <p>• Look directly at the camera</p>
          <p>• Remove glasses if possible</p>
        </div>
      </div>
    </div>
  );
};

export default FaceScanAttendance;