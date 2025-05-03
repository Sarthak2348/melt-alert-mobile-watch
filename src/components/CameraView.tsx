
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Cog, FilmIcon, PauseIcon, PlayIcon, Timer } from 'lucide-react';
import { NotificationService } from '@/services/NotificationService';
import { MeltDetectionService } from '@/services/MeltDetectionService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const enhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionData, setDetectionData] = useState<any>(null);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [fps, setFps] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const { toast } = useToast();
  
  const fpsCounterRef = useRef<{
    frames: number;
    lastTime: number;
    processingTimes: number[];
  }>({
    frames: 0,
    lastTime: 0,
    processingTimes: []
  });
  
  useEffect(() => {
    // Request camera permissions and setup when component mounts
    setupCamera();
    
    // Clean up on unmount
    return () => {
      stopCamera();
    };
  }, []);
  
  // Update detection settings when sensitivity changes
  useEffect(() => {
    MeltDetectionService.updateSettings({
      sensitivity
    });
  }, [sensitivity]);
  
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
          toast({
            title: "Camera ready",
            description: "Real-time melt detection has started",
          });
          startDetectionLoop();
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: "Camera error",
        description: "Could not access the camera",
        variant: "destructive"
      });
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
      toast({
        title: "Camera stopped",
        description: "Detection has been paused"
      });
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
      fpsCounterRef.current.lastTime = performance.now();
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.processingTimes = [];
      processVideoFrame();
    }
  };
  
  const processVideoFrame = async () => {
    setIsProcessing(true);
    
    try {
      if (videoRef.current && isStreaming) {
        const startTime = performance.now();
        
        // Capture the current frame
        const canvas = captureFrame();
        
        if (canvas && videoRef.current) {
          // Use the enhanced melt detection service
          const result = await MeltDetectionService.detectMelting(videoRef.current, {
            sensitivity
          });
          
          // Store detection data for display
          setDetectionData(result.detectionData);
          
          // Show enhanced image if requested
          if (showEnhanced && enhancedCanvasRef.current && result.detectionData) {
            const ctx = enhancedCanvasRef.current.getContext('2d');
            if (ctx) {
              enhancedCanvasRef.current.width = canvas.width;
              enhancedCanvasRef.current.height = canvas.height;
              ctx.drawImage(canvas, 0, 0);
              
              // Highlight detection areas
              if (result.confidence > 5) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                
                // If we have region data, use it to highlight
                if (result.detectionData.regionOfInterest) {
                  const roi = result.detectionData.regionOfInterest;
                  ctx.fillRect(
                    roi.left * canvas.width,
                    roi.top * canvas.height,
                    roi.width * canvas.width,
                    roi.height * canvas.height
                  );
                } else {
                  // Generic highlight in the center
                  ctx.fillRect(
                    canvas.width * 0.25,
                    canvas.height * 0.25,
                    canvas.width * 0.5,
                    canvas.height * 0.5
                  );
                }
              }
            }
          }
          
          // If melting is detected, trigger the alert
          if (result.detected && !isMeltingDetected) {
            onMeltingDetected();
          }
        }
        
        // Calculate processing time and FPS
        const endTime = performance.now();
        const frameTime = endTime - startTime;
        
        // Update FPS counter
        fpsCounterRef.current.processingTimes.push(frameTime);
        fpsCounterRef.current.frames++;
        
        if (endTime - fpsCounterRef.current.lastTime >= 1000) {
          setFps(fpsCounterRef.current.frames);
          
          // Calculate average processing time
          const avgProcessingTime = fpsCounterRef.current.processingTimes.reduce(
            (sum, time) => sum + time, 0
          ) / fpsCounterRef.current.processingTimes.length;
          
          setProcessingTime(Math.round(avgProcessingTime));
          
          // Reset for next second
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = endTime;
          fpsCounterRef.current.processingTimes = [];
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
  
  const toggleEnhancedView = () => {
    setShowEnhanced(!showEnhanced);
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Camera feed */}
      <div className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden border-2",
        isMeltingDetected ? "border-red-500 animate-pulse-alert" : "border-lab-blue"
      )}>
        {/* Main video feed (hidden when showing enhanced view) */}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          className={cn("w-full h-full object-cover", showEnhanced ? "hidden" : "")}
        />
        
        {/* Enhanced view (shown when toggle is active) */}
        {showEnhanced && (
          <canvas
            ref={enhancedCanvasRef}
            className="w-full h-full object-cover"
          />
        )}
        
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
        
        {/* Region of interest guide */}
        {isStreaming && !showEnhanced && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute border-2 border-dashed border-lab-blue opacity-50 rounded-md"
              style={{
                top: '25%',
                left: '25%',
                width: '50%',
                height: '50%'
              }}
            />
          </div>
        )}
        
        {/* Performance indicators */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded flex items-center space-x-2">
          <Timer className="h-3 w-3" />
          <span>{fps} FPS</span>
          <span>{processingTime}ms</span>
        </div>
      </div>

      {/* Detection info overlay */}
      {detectionData && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <p>Confidence: {detectionData.normalizedScore?.toFixed(2)}%</p>
          {detectionData.temporalChangeDetected && (
            <p className="text-yellow-300">Change Detected</p>
          )}
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
        
        <Button
          variant="outline"
          size="icon"
          className={cn("rounded-full", showEnhanced && "bg-blue-100")}
          onClick={toggleEnhancedView}
          title="Toggle enhanced view"
        >
          <Cog className="h-5 w-5" />
        </Button>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
