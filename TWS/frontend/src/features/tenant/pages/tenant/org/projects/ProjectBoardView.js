/**
 * Project-scoped Board view (Kanban) for the project workspace.
 * Renders ProjectTasks with projectId from URL and board view locked.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ProjectTasks from './ProjectTasks';

const ProjectBoardView = () => {
  const { projectId } = useParams();
  return (
    <div className="min-w-0 max-w-full px-2 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4">
      <ProjectTasks
        scopeProjectId={projectId}
        defaultView="kanban"
        hideScopedHeader
      />
    </div>
  );
};

export default ProjectBoardView;
