/**
 * Gantt Legend Component
 * Displays legend and key information
 */

import React from 'react';

const GanttLegend = ({ settings }) => {
  return (
    <div className="gantt-legend border-t border-gray-200 bg-gray-50 px-4 py-2 flex items-center gap-4 text-xs flex-wrap">
      <div className="font-semibold text-gray-700">Legend:</div>
      
      {/* Category Colors */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-accent-500 rounded"></div>
        <span className="text-gray-600">Planning</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-pink-500 rounded"></div>
        <span className="text-gray-600">Design</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded"></div>
        <span className="text-gray-600">Frontend</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-500 rounded"></div>
        <span className="text-gray-600">Backend</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
        <span className="text-gray-600">Integration</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-orange-500 rounded"></div>
        <span className="text-gray-600">Testing</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 rounded"></div>
        <span className="text-gray-600">Deployment</span>
      </div>
      
      {/* Status Indicators */}
      <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
        <div className="w-4 h-4 bg-red-500 rounded ring-2 ring-red-300"></div>
        <span className="text-gray-600">Critical Path</span>
      </div>
      
      {settings.showProgressIndicator && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span className="text-gray-600">Progress</span>
        </div>
      )}
      
      {settings.showResourceAllocation && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
          <span className="text-gray-600">Resource Allocated</span>
        </div>
      )}
    </div>
  );
};

export default GanttLegend;
