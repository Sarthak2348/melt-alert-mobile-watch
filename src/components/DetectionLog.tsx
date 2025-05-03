
import React from 'react';
import { cn } from '@/lib/utils';

export interface DetectionEvent {
  id: string;
  timestamp: Date;
  confidence: number;
  imageUrl?: string;
}

interface DetectionLogProps {
  events: DetectionEvent[];
  onClearLog: () => void;
}

const DetectionLog: React.FC<DetectionLogProps> = ({ events, onClearLog }) => {
  if (events.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lab-dark font-medium text-lg">Detection History</h3>
        </div>
        <div className="text-center py-6 text-gray-500">
          <p>No detection events recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lab-dark font-medium text-lg">Detection History</h3>
        <button 
          onClick={onClearLog}
          className="text-sm text-lab-blue hover:underline"
        >
          Clear History
        </button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {events.map((event) => (
          <div 
            key={event.id} 
            className="border border-gray-200 rounded-md p-3 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  event.confidence > 75 ? "bg-red-100 text-red-800" :
                  event.confidence > 50 ? "bg-amber-100 text-amber-800" :
                  "bg-blue-100 text-blue-800"
                )}>
                  {event.confidence.toFixed(1)}% confidence
                </span>
              </div>
            </div>
            
            {event.imageUrl && (
              <div className="mt-2">
                <img 
                  src={event.imageUrl} 
                  alt={`Detection at ${event.timestamp.toLocaleString()}`}
                  className="w-full rounded-md"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionLog;
