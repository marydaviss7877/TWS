import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  WifiIcon,
  HomeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const TeamCollaboration = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState({
    onlineMembers: 0,
    focusMode: 0,
    totalCollaboration: 0
  });

  useEffect(() => {
    fetchTeamData();
    fetchTeamStats();
  }, []);

  const fetchTeamData = async () => {
    try {
      const response = await axios.get('/api/attendance/team/members');
      if (response.data.success) {
        setTeamMembers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const response = await axios.get('/api/attendance/team/stats');
      if (response.data.success) {
        setTeamStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'busy': return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'away': return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      case 'focus': return <div className="w-3 h-3 bg-accent-500 rounded-full"></div>;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    }
  };

  const getWorkModeIcon = (mode) => {
    switch (mode) {
      case 'office': return BuildingOfficeIcon;
      case 'remote': return HomeIcon;
      case 'hybrid': return WifiIcon;
      default: return ComputerDesktopIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'away': return 'bg-gray-100 text-gray-800';
      case 'focus': return 'bg-accent-100 text-accent-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {teamStats.onlineMembers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Online</div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {teamStats.focusMode}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Focus Mode</div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {teamStats.totalCollaboration}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Collaboration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
          Team Members
        </h3>
        <div className="space-y-4">
          {teamMembers.map((member, index) => {
            const WorkModeIcon = getWorkModeIcon(member.workMode);
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-accent-600 flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0)}
                    </div>
                    {getStatusIcon(member.status)}
                  </div>
                  <div className="ml-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <WorkModeIcon className="h-4 w-4 mr-1" />
                      {member.workMode} • {member.project}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                    {member.status}
                  </span>
                  {member.status === 'online' && (
                    <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamCollaboration;
