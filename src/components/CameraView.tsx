
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Cog, FilmIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { NotificationService } from '@/services/NotificationService';
import { MeltDetectionService } from '@/services/MeltDetectionService';
import { cn } from '@/lib/utils';

interface CameraViewProps {
  onMeltingDetected: () => void;
  isMeltingDetected: boolean;
  sensitivity: number;
}

const CameraView: React.FC<CameraViewProps> = ({ 
  onMeltingDetected, 
  isMeltingDetected,
  sensitivity 
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionData, setDetectionData] = useState<any>(null);
  
  useEffect(() => {
    // Request camera permissions and setup when component mounts
    setupCamera();
    
    // Clean up on unmount
    return () => {
      stopCamera();
    };
  }, []);
  
  const setupCamera = async () => {
    try {
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        
        // Start detection loop once video is playing
        videoRef.current.onloadedmetadata = () => {
          startDetectionLoop();
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach((track) => {
        track.stop();
      });
      
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };
  
  const toggleCamera = () => {
    if (isStreaming) {
      stopCamera();
    } else {
      setupCamera();
    }
  };
  
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        return canvas;
      }
    }
    return null;
  };
  
  const startDetectionLoop = () => {
    if (!isProcessing) {
      processVideoFrame();
    }
  };
  
  const processVideoFrame = async () => {
    setIsProcessing(true);
    
    try {
      if (videoRef.current && isStreaming) {
        // Capture the current frame
        const canvas = captureFrame();
        
        if (canvas && videoRef.current) {
          // Use your melt detection service
          const result = await MeltDetectionService.detectMelting(videoRef.current);
          
          // Store detection data for display
          setDetectionData(result.detectionData);
          
          // Apply sensitivity threshold
          const adjustedThreshold = 5 * (sensitivity / 50);
          const isMelting = result.confidence > adjustedThreshold;
          
          // If melting is detected, trigger the alert
          if (isMelting && !isMeltingDetected) {
            onMeltingDetected();
          }
        }
      }
    } catch (error) {
      console.error('Error processing video frame:', error);
    } finally {
      setIsProcessing(false);
      
      // Continue the detection loop if still streaming
      if (isStreaming) {
        // Use requestAnimationFrame for smooth performance
        requestAnimationFrame(processVideoFrame);
      }
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Camera feed */}
      <div className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden border-2",
        isMeltingDetected ? "border-red-500 animate-pulse-alert" : "border-lab-blue"
      )}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          className="w-full h-full object-cover"
        />
        
        {isMeltingDetected && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
            <div className="bg-white bg-opacity-90 rounded-lg px-6 py-4">
              <h3 className="text-red-500 font-bold text-lg">MELTING DETECTED!</h3>
            </div>
          </div>
        )}
        
        {!isStreaming && (
          <div className="absolute inset-0 bg-lab-gray bg-opacity-80 flex items-center justify-center">
            <Camera size={48} className="text-lab-blue" />
            <p className="ml-2 text-lab-dark">Camera is off</p>
          </div>
        )}
      </div>

      {/* Detection info overlay */}
      {detectionData && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <p>Confidence: {detectionData.percentage.toFixed(2)}%</p>
        </div>
      )}

      {/* Camera controls */}
      <div className="w-full flex justify-center mt-4 space-x-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full" 
          onClick={toggleCamera}
        >
          {isStreaming ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
