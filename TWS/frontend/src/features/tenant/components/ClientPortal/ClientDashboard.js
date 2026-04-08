import React, { useState, useEffect } from 'react';
import { 
  EyeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const ClientDashboard = ({ clientId }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchClientProjects();
  }, [clientId]);

  const fetchClientProjects = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clients/${clientId}/projects`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching client projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (cardId, approved) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cards/${cardId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // SECURITY FIX: Use cookies instead of localStorage token
        body: JSON.stringify({ approved })
      });

      if (response.ok) {
        // Refresh projects to show updated status
        fetchClientProjects();
      }
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
        <p className="mt-2 text-gray-600">Review and approve project deliverables</p>
      </div>

      {selectedProject ? (
        <ProjectDetailView 
          project={selectedProject} 
          onBack={() => setSelectedProject(null)}
          onApproval={handleApproval}
        />
      ) : (
        <ProjectsOverview 
          projects={projects} 
          onSelectProject={setSelectedProject}
        />
      )}
    </div>
  );
};

const ProjectsOverview = ({ projects, onSelectProject }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div 
          key={project._id}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectProject(project)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4">{project.description}</p>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Due: {new Date(project.endDate).toLocaleDateString()}
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              {project.pendingApprovals || 0} items pending approval
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectDetailView = ({ project, onBack, onApproval }) => {
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliverables();
  }, [project._id]);

  const fetchDeliverables = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/client-portal/projects/${project._id}/deliverables`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });

      if (response.ok) {
        const data = await response.json();
        setDeliverables(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching deliverables:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Projects
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
        <p className="text-gray-600 mt-2">{project.description}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Deliverables for Review</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {deliverables.map((deliverable) => (
            <DeliverableItem 
              key={deliverable._id}
              deliverable={deliverable}
              onApproval={onApproval}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const DeliverableItem = ({ deliverable, onApproval }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <EyeIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {getStatusIcon(deliverable.status)}
            <h4 className="ml-2 text-lg font-medium text-gray-900">{deliverable.title}</h4>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
              {deliverable.status}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3">{deliverable.description}</p>
          
          {deliverable.attachments && deliverable.attachments.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Attachments:</p>
              <div className="space-y-1">
                {deliverable.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {attachment.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {deliverable.comments && deliverable.comments.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Comments:</p>
              <div className="space-y-1">
                {deliverable.comments.map((comment, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    <span className="font-medium">{comment.author}:</span> {comment.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {deliverable.status === 'pending' && (
          <div className="ml-4 flex space-x-2">
            <button
              onClick={() => onApproval(deliverable._id, true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Approve
            </button>
            <button
              onClick={() => onApproval(deliverable._id, false)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
