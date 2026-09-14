import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { FileText, Upload, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch indexed documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('title', title || file.name);
      formData.append('file', file);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(`Document '${file.name}' uploaded and indexed for RAG vector search!`);
      setIsUploadModalOpen(false);
      setTitle('');
      setFile(null);
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading Knowledge Index Documents..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>RAG Knowledge Base & Document Indexing</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Upload society bylaws, security guidelines, and rules for the AI RAG Chatbot.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload size={16} /> Upload New Document
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="No Documents Indexed"
          description="Upload PDF or text documents to train the AI Concierge knowledge base."
          icon={FileText}
          actionLabel="Upload Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Doc ID</th>
                  <th>Title</th>
                  <th>Filename</th>
                  <th>Uploaded At</th>
                  <th>Uploaded By</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{doc.id}</td>
                    <td style={{ fontWeight: '600', color: '#f8fafc' }}>{doc.title}</td>
                    <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{doc.filename}</td>
                    <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                    <td>User #{doc.uploaded_by_user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        title="Upload Document for RAG Vector Indexing"
        onClose={() => setIsUploadModalOpen(false)}
      >
        <form onSubmit={handleUploadSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
              Document Title
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Resident Bye-Laws 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
              Document File (PDF / TXT / DOCX) *
            </label>
            <input
              type="file"
              className="input-field"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Indexing Document...' : 'Upload & Index'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
