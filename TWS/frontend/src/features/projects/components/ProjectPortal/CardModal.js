import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CalendarIcon, 
  UserIcon, 
  PaperClipIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../../shared/utils/axiosInstance';
import { handleApiError, handleSuccess } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES } from '../../constants/projectConstants';

const CardModal = ({ isOpen, onClose, card, onUpdate, projectId, boardId, listId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [dueDate, setDueDate] = useState(card?.dueDate ? card.dueDate.split('T')[0] : '');
  const [priority, setPriority] = useState(card?.priority || 'medium');
  const [assignees, setAssignees] = useState(card?.assignees || []);
  const [comments, setComments] = useState(card?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [checklists, setChecklists] = useState(card?.checklists || []);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '');
      setPriority(card.priority || 'medium');
      setAssignees(card.assignees || []);
      setComments(card.comments || []);
      setChecklists(card.checklists || []);
    }
  }, [card]);

  const handleSave = async () => {
    if (isSavingCard) return;
    setIsSavingCard(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        priority,
        assignees: assignees.map(a => a._id || a)
      };

      const response = await axiosInstance.patch(`/api/cards/${card._id}`, updates);

      if (response.data?.success) {
        handleSuccess(SUCCESS_MESSAGES.CARD_UPDATED);
        onUpdate(updates);
        setIsEditing(false);
      } else {
        handleApiError(new Error(response.data?.message || 'Failed to update card'));
      }
    } catch (error) {
      handleApiError(error, 'Failed to update card');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const response = await axiosInstance.post(`/api/cards/${card._id}/comments`, {
        text: newComment.trim()
      });

      if (response.data?.success) {
        handleSuccess('Comment added successfully');
        setComments(prev => [...prev, response.data.data?.comment]);
        setNewComment('');
      } else {
        handleApiError(new Error(response.data?.message || 'Failed to add comment'));
      }
    } catch (error) {
      handleApiError(error, 'Failed to add comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim() || isSavingChecklist) return;
    setIsSavingChecklist(true);

    const newChecklist = {
      title: newChecklistTitle.trim(),
      items: [],
      createdAt: new Date()
    };

    try {
      const response = await axiosInstance.patch(`/api/cards/${card._id}`, {
        checklists: [...checklists, newChecklist]
      });

      if (response.data?.success) {
        handleSuccess('Checklist added successfully');
        setChecklists(prev => [...prev, newChecklist]);
        setNewChecklistTitle('');
        setIsAddingChecklist(false);
      } else {
        handleApiError(new Error(response.data?.message || 'Failed to add checklist'));
      }
    } catch (error) {
      handleApiError(error, 'Failed to add checklist');
    } finally {
      setIsSavingChecklist(false);
    }
  };

  const handleChecklistItemToggle = async (checklistIndex, itemIndex) => {
    const updatedChecklists = [...checklists];
    updatedChecklists[checklistIndex].items[itemIndex].completed = 
      !updatedChecklists[checklistIndex].items[itemIndex].completed;

    try {
      const response = await axiosInstance.patch(`/api/cards/${card._id}`, {
        checklists: updatedChecklists
      });

      if (response.data?.success) {
        setChecklists(updatedChecklists);
      } else {
        handleApiError(new Error(response.data?.message || 'Failed to update checklist'), 'Failed to update checklist', { showToast: false });
      }
    } catch (error) {
      handleApiError(error, 'Failed to update checklist', { showToast: false });
    }
  };

  const handleCompleteCard = async () => {
    try {
      const response = await axiosInstance.patch(`/api/cards/${card._id}/complete`);
      
      if (response.data?.success) {
        handleSuccess('Card completed successfully');
        onUpdate({ completed: true, completedAt: new Date() });
      } else {
        handleApiError(new Error(response.data?.message || 'Failed to complete card'));
      }
    } catch (error) {
      handleApiError(error, 'Failed to complete card');
    }
  };

  if (!isOpen || !card) return null;

  const completedSubtasks = card.subtasks?.filter(subtask => subtask.completed).length || 0;
  const totalSubtasks = card.subtasks?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {card.completed && (
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Card' : 'Card Details'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {!card.completed && (
              <button
                onClick={handleCompleteCard}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title */}
          <div className="mb-4">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-semibold border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Card title"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {card.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Card Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">
                  {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date'}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              {isEditing ? (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <span className={`px-2 py-1 text-xs font-medium rounded text-white ${
                  priority === 'urgent' ? 'bg-red-500' :
                  priority === 'high' ? 'bg-orange-500' :
                  priority === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Assignees
            </label>
            <div className="flex flex-wrap gap-2">
              {assignees.map((assignee, index) => (
                <div
                  key={assignee._id || assignee}
                  className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                >
                  {assignee.fullName}
                  {isEditing && (
                    <button
                      onClick={() => setAssignees(prev => prev.filter((_, i) => i !== index))}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Checklists */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Checklists</h4>
              {isEditing && (
                <button
                  onClick={() => setIsAddingChecklist(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  <PlusIcon className="h-4 w-4 inline mr-1" />
                  Add Checklist
                </button>
              )}
            </div>

            {checklists.map((checklist, checklistIndex) => (
              <div key={checklist.id || checklistIndex} className="mb-3">
                <h5 className="text-sm font-medium text-gray-600 mb-2">
                  {checklist.title}
                </h5>
                <div className="space-y-1">
                  {checklist.items.map((item, itemIndex) => (
                    <label
                      key={item.id || itemIndex}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleChecklistItemToggle(checklistIndex, itemIndex)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {isAddingChecklist && (
              <div className="border border-gray-300 rounded p-3">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Checklist title"
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddChecklist}
                    disabled={isSavingChecklist}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingChecklist(false);
                      setNewChecklistTitle('');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              <ChatBubbleLeftIcon className="h-4 w-4 inline mr-1" />
              Comments
            </h4>
            
            <div className="space-y-3 mb-4">
              {comments.map((comment, index) => (
                <div key={comment._id || index} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.userId?.fullName || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.text}</p>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isPostingComment}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Attachments */}
          {card.attachments && card.attachments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                <PaperClipIcon className="h-4 w-4 inline mr-1" />
                Attachments
              </h4>
              <div className="space-y-2">
                {card.attachments.map((attachment, index) => (
                  <div key={attachment.id || attachment.url || index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{attachment.fileName}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(attachment.fileSize / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSavingCard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingCard ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardModal;
