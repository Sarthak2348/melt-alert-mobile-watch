
import React from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AlertControlsProps {
  isMeltingDetected: boolean;
  isAlarmEnabled: boolean;
  isNotificationsEnabled: boolean;
  sensitivity: number;
  onAlarmToggle: () => void;
  onNotificationsToggle: () => void;
  onSensitivityChange: (value: number[]) => void;
  onDismissAlert: () => void;
}

const AlertControls: React.FC<AlertControlsProps> = ({
  isMeltingDetected,
  isAlarmEnabled,
  isNotificationsEnabled,
  sensitivity,
  onAlarmToggle,
  onNotificationsToggle,
  onSensitivityChange,
  onDismissAlert
}) => {
  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4 space-y-4">
      <h3 className="text-lab-dark font-medium text-lg">Alert Controls</h3>
      
      {isMeltingDetected && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
              <span className="font-medium text-red-800">Melting Detected!</span>
            </div>
            <Button size="sm" variant="outline" onClick={onDismissAlert}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className={isAlarmEnabled ? "text-lab-blue" : "text-gray-400"} size={20} />
          <Label htmlFor="alarm-toggle">Sound Alarm</Label>
        </div>
        <Switch 
          id="alarm-toggle"
          checked={isAlarmEnabled} 
          onCheckedChange={onAlarmToggle}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className={isNotificationsEnabled ? "text-lab-blue" : "text-gray-400"} size={20} />
          <Label htmlFor="notifications-toggle">Notifications</Label>
        </div>
        <Switch 
          id="notifications-toggle"
          checked={isNotificationsEnabled} 
          onCheckedChange={onNotificationsToggle}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="detection-sensitivity">Detection Sensitivity</Label>
          <span className="text-sm text-gray-500">{sensitivity}%</span>
        </div>
        <Slider
          id="detection-sensitivity"
          defaultValue={[sensitivity]}
          max={100}
          step={1}
          onValueChange={onSensitivityChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default AlertControls;
