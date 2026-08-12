import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  FolderIcon,
  PlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import * as documentHubApi from '../../documents/documentHubApi';

const EmployeeDocumentsView = ({ tenantSlug }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchHrDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const empResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${user.id}`, {
        credentials: 'include'
      });
      if (empResponse.ok) {
        const empData = await empResponse.json();
        if (empData.data?.employees?.length > 0) {
          const employee = empData.data.employees[0];
          setDocuments(Array.isArray(employee.documents) ? employee.documents : []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch HR documents:', error);
      toast.error('Failed to load documents');
    }
  }, [tenantSlug, user?.id]);

  const fetchMyDocs = useCallback(async () => {
    if (!tenantSlug || !user?.id) return;
    try {
      const res = await documentHubApi.listDocuments(tenantSlug, { ownerId: user.id, limit: 50 });
      const list = res.data?.documents ?? [];
      setMyDocs(Array.isArray(list) ? list : []);
    } catch {
      setMyDocs([]);
    }
  }, [tenantSlug, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchHrDocuments();
      if (!cancelled) await fetchMyDocs();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchHrDocuments, fetchMyDocs]);

  const downloadDocument = async (document) => {
    try {
      if (document.fileUrl) {
        window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Document URL not available');
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = (document) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Document URL not available');
    }
  };

  const getDocumentTypeIcon = (type) => {
    return <DocumentTextIcon className="h-6 w-6 text-purple-600" />;
  };

  const getDocumentTypeColor = (type) => {
    const colors = {
      'contract': 'bg-blue-100 text-blue-800',
      'id': 'bg-green-100 text-green-800',
      'certificate': 'bg-purple-100 text-purple-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter(doc => doc.type === filter);

  const openOrgDocument = (docId) => {
    navigate(`/${tenantSlug}/org/documents/${docId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My documents (Document Hub – created by me) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My documents</h2>
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/documents/new`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create document
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Documents you created in the org Document Hub. Create proposals, notes, and more.</p>
        {myDocs.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myDocs.map((doc) => (
              <div
                key={doc._id}
                role="button"
                tabIndex={0}
                onClick={() => openOrgDocument(doc._id)}
                onKeyDown={(e) => e.key === 'Enter' && openOrgDocument(doc._id)}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <PencilSquareIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title || 'Untitled'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No documents yet. Create one to get started.</p>
        )}
      </div>

      {/* From HR */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">From HR</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Documents</option>
            <option value="contract">Contracts</option>
            <option value="id">ID Documents</option>
            <option value="certificate">Certificates</option>
            <option value="other">Other</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Documents assigned to you by HR (contracts, certificates, etc.).</p>

        {filteredDocuments.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document, index) => (
              <div
                key={document._id || index}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getDocumentTypeIcon(document.type)}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{document.fileName || 'Document'}</h3>
                      <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.type)}`}>
                        {document.type || 'other'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {document.uploadedAt && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {new Date(document.uploadedAt).toLocaleDateString()}
                    </div>
                  )}
                  {document.version && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Version {document.version}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => viewDocument(document)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => downloadDocument(document)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-8 text-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No HR documents</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {filter !== 'all' ? 'Try selecting a different filter' : 'Documents from HR will appear here when assigned'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDocumentsView;
