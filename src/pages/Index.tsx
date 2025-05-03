
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Camera, ClipboardList, Settings } from 'lucide-react';
import CameraView from '@/components/CameraView';
import AlertControls from '@/components/AlertControls';
import DetectionLog, { DetectionEvent } from '@/components/DetectionLog';
import { NotificationService } from '@/services/NotificationService';

const Index = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [isMeltingDetected, setIsMeltingDetected] = useState<boolean>(false);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState<boolean>(true);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState<boolean>(true);
  const [sensitivity, setSensitivity] = useState<number>(50);
  const [detectionEvents, setDetectionEvents] = useState<DetectionEvent[]>([]);
  
  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      await NotificationService.initialize();
    };
    
    initServices();
  }, []);
  
  // Handle melting detection
  const handleMeltingDetected = async () => {
    if (isMeltingDetected) return; // Already detected and handling it
    
    console.log('Melting detected!');
    setIsMeltingDetected(true);
    
    // Log event
    const newEvent: DetectionEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      confidence: 85 + (Math.random() * 10), // Demo value
      // In a real app, we would capture and save the image here
    };
    
    setDetectionEvents(prev => [newEvent, ...prev]);
    
    // Trigger notification if enabled
    if (isNotificationsEnabled) {
      await NotificationService.sendNotification(
        'Melting Alert!', 
        'Compound melting has been detected.'
      );
    }
    
    // Trigger alarm if enabled
    if (isAlarmEnabled) {
      NotificationService.playAlarm();
    }
  };
  
  // Dismiss the alert
  const handleDismissAlert = () => {
    setIsMeltingDetected(false);
    NotificationService.stopAlarm();
  };
  
  // Clear detection log
  const handleClearLog = () => {
    setDetectionEvents([]);
  };
  
  // Handle sensitivity change
  const handleSensitivityChange = (values: number[]) => {
    if (values.length > 0) {
      setSensitivity(values[0]);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-lg font-medium text-lab-dark">Melt Alert</h1>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {/* Camera and controls */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <CameraView 
            onMeltingDetected={handleMeltingDetected} 
            isMeltingDetected={isMeltingDetected}
            sensitivity={sensitivity}
          />
        </div>
        
        {/* Alert controls */}
        <AlertControls 
          isMeltingDetected={isMeltingDetected}
          isAlarmEnabled={isAlarmEnabled}
          isNotificationsEnabled={isNotificationsEnabled}
          sensitivity={sensitivity}
          onAlarmToggle={() => setIsAlarmEnabled(!isAlarmEnabled)}
          onNotificationsToggle={() => setIsNotificationsEnabled(!isNotificationsEnabled)}
          onSensitivityChange={handleSensitivityChange}
          onDismissAlert={handleDismissAlert}
        />
        
        {/* Detection log */}
        <DetectionLog 
          events={detectionEvents} 
          onClearLog={handleClearLog} 
        />
      </main>
      
      {/* Footer tabs */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="camera" className="flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center">
                <ClipboardList className="w-4 h-4 mr-2" />
                Log
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </footer>
    </div>
  );
};

export default Index;
