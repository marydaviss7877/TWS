import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { clientPortalApi } from './clientPortalApi';

const StatusBadge = ({ status }) => {
  const statusClass = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-yellow-100 text-yellow-800'
  }[status] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
      {(status || 'active').replace('_', ' ')}
    </span>
  );
};

const ClientProjectsView = () => {
  const navigate = useNavigate();
  const { projectId, deliverableId } = useParams();
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyCardId, setBusyCardId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (!projectId) {
          const list = await clientPortalApi.getProjects();
          setProjects(Array.isArray(list) ? list : []);
          setProject(null);
          setDeliverables([]);
          return;
        }

        const [projectData, deliverablesData] = await Promise.all([
          clientPortalApi.getProjectById(projectId),
          clientPortalApi.getProjectDeliverables(projectId)
        ]);
        setProject(projectData || null);
        setDeliverables(Array.isArray(deliverablesData) ? deliverablesData : []);
      } catch (err) {
        setError(err?.message || 'Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId]);

  const selectedDeliverable = useMemo(
    () => deliverables.find((item) => String(item._id) === String(deliverableId)) || null,
    [deliverables, deliverableId]
  );

  const handleApprovalAction = async (cardId, approved) => {
    setBusyCardId(cardId);
    try {
      const comment = commentDrafts[cardId]?.trim() || '';
      await clientPortalApi.approveDeliverable(cardId, approved, comment);
      const updatedDeliverables = await clientPortalApi.getProjectDeliverables(projectId);
      setDeliverables(Array.isArray(updatedDeliverables) ? updatedDeliverables : []);
      setCommentDrafts((prev) => ({ ...prev, [cardId]: '' }));
    } catch (err) {
      setError(err?.message || 'Failed to submit approval');
    } finally {
      setBusyCardId(null);
    }
  };

  const handleAddComment = async (cardId) => {
    const text = commentDrafts[cardId]?.trim();
    if (!text) return;
    setBusyCardId(cardId);
    try {
      await clientPortalApi.addDeliverableComment(cardId, text);
      const updatedDeliverables = await clientPortalApi.getProjectDeliverables(projectId);
      setDeliverables(Array.isArray(updatedDeliverables) ? updatedDeliverables : []);
      setCommentDrafts((prev) => ({ ...prev, [cardId]: '' }));
    } catch (err) {
      setError(err?.message || 'Failed to add comment');
    } finally {
      setBusyCardId(null);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Overview</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            View assigned projects, review deliverables, and approve milestones.
          </p>
        </div>
        <Link
          to={deliverableId ? '../../../..' : (projectId ? '../..' : '../')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Apps
        </Link>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      {!projectId ? (
        <ProjectsOverview projects={projects} onOpenProject={(id) => navigate(`../projects/${id}`)} />
      ) : (
        <ProjectDetailView
          project={project}
          deliverables={deliverables}
          selectedDeliverable={selectedDeliverable}
          onOpenDeliverable={(id) => navigate(`../projects/${projectId}/deliverables/${id}`)}
          onBack={() => navigate('../projects')}
          onBackToProject={() => navigate(`../projects/${projectId}`)}
          onApprove={handleApprovalAction}
          onAddComment={handleAddComment}
          commentDrafts={commentDrafts}
          setCommentDrafts={setCommentDrafts}
          busyCardId={busyCardId}
        />
      )}
    </div>
  );
};

const ProjectsOverview = ({ projects, onOpenProject }) => {
  if (!projects.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-600 dark:text-gray-300">
        No client-assigned projects found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <button
          key={project._id}
          type="button"
          className="text-left bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          onClick={() => onOpenProject(project._id)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
            <StatusBadge status={project.status} />
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{project.description || '-'}</p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-4 w-4 mr-2" />
              Due: {project?.timeline?.endDate ? new Date(project.timeline.endDate).toLocaleDateString() : '-'}
            </div>

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              {project.pendingApprovals || 0} items pending review
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const ProjectDetailView = ({
  project,
  deliverables,
  selectedDeliverable,
  onOpenDeliverable,
  onBack,
  onBackToProject,
  onApprove,
  onAddComment,
  commentDrafts,
  setCommentDrafts,
  busyCardId
}) => (
  <div>
    <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-4 text-sm">
      ← Back to Projects
    </button>

    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project?.name}</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{project?.description || '-'}</p>
      </div>
      <StatusBadge status={project?.status} />
    </div>

    {selectedDeliverable ? (
      <DeliverableDetail
        deliverable={selectedDeliverable}
        onBack={onBackToProject}
        onApprove={onApprove}
        onAddComment={onAddComment}
        commentDraft={commentDrafts[selectedDeliverable._id] || ''}
        setCommentDraft={(value) => setCommentDrafts((prev) => ({ ...prev, [selectedDeliverable._id]: value }))}
        busy={busyCardId === selectedDeliverable._id}
      />
    ) : (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deliverables</h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {deliverables.map((deliverable) => (
            <DeliverableItem
              key={deliverable._id}
              deliverable={deliverable}
              onOpen={() => onOpenDeliverable(deliverable._id)}
            />
          ))}
          {!deliverables.length && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">No deliverables available.</div>
          )}
        </div>
      </div>
    )}
  </div>
);

const DeliverableItem = ({ deliverable, onOpen }) => {
  const decisionStatus = typeof deliverable?.clientApproval?.approved === 'boolean'
    ? (deliverable.clientApproval.approved ? 'approved' : 'rejected')
    : null;
  const effectiveStatus = decisionStatus || deliverable.status;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'review':
      case 'testing':
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'done': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default: return <EyeIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'review':
      case 'testing':
      case 'pending': return 'text-yellow-600';
      case 'done': return 'text-green-600';
      case 'blocked': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <button type="button" className="px-6 py-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/40" onClick={onOpen}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {getStatusIcon(effectiveStatus)}
            <h4 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">{deliverable.title}</h4>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(effectiveStatus)}`}>
              {String(effectiveStatus || 'pending').replace('_', ' ')}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-3">{deliverable.description}</p>

          {deliverable.attachments && deliverable.attachments.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Download links:</p>
              <div className="space-y-1">
                {deliverable.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm block"
                  >
                    {attachment.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

const DeliverableDetail = ({
  deliverable,
  onBack,
  onApprove,
  onAddComment,
  commentDraft,
  setCommentDraft,
  busy
}) => {
  const isApproved = !!deliverable?.clientApproval?.approved;
  const hasDecision = typeof deliverable?.clientApproval?.approved === 'boolean';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
      <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm">
        ← Back to deliverables
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{deliverable.title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{deliverable.description || '-'}</p>
        </div>
        <StatusBadge status={deliverable.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
          <p className="font-medium text-gray-900 dark:text-white">Due Date</p>
          <p className="text-gray-600 dark:text-gray-300">{deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString() : '-'}</p>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
          <p className="font-medium text-gray-900 dark:text-white">Client Decision</p>
          <p className="text-gray-600 dark:text-gray-300">
            {!hasDecision ? 'Pending your review' : (isApproved ? 'Approved' : 'Changes requested')}
          </p>
        </div>
      </div>

      {Array.isArray(deliverable.attachments) && deliverable.attachments.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Attachments</p>
          <div className="space-y-1">
            {deliverable.attachments.map((attachment, index) => (
              <a key={index} href={attachment.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:text-blue-800">
                {attachment.name || `Attachment ${index + 1}`}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Comment
        </label>
        <textarea
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="Share feedback with the project team"
          rows={3}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddComment(deliverable._id)}
            disabled={busy || !commentDraft.trim()}
            className="px-3 py-2 text-sm rounded bg-slate-700 text-white disabled:opacity-50"
          >
            Add Comment
          </button>
          <button
            type="button"
            onClick={() => onApprove(deliverable._id, true)}
            disabled={busy}
            className="px-3 py-2 text-sm rounded bg-green-600 text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onApprove(deliverable._id, false)}
            disabled={busy}
            className="px-3 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50"
          >
            Request Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const ErrorNotice = ({ message }) => (
  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {message}
  </div>
);

export default ClientProjectsView;
