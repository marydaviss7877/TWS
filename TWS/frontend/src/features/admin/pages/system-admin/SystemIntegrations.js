import React from 'react';
import AdminPageTemplate from '../../../../components/AdminPageTemplate/AdminPageTemplate';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';

const SystemIntegrations = () => {
  const stats = [
    { label: 'Active Integrations', value: '12', icon: PuzzlePieceIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' }
  ];

  return (
    <AdminPageTemplate title="System Integrations" description="Manage third-party integrations" stats={stats}>
      <div className="glass-card-premium p-6 hover-glow">
        <div className="text-center py-12">
          <PuzzlePieceIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Integrations management interface ready for implementation</p>
        </div>
      </div>
    </AdminPageTemplate>
  );
};

export default SystemIntegrations;
