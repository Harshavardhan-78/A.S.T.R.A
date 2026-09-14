import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { MessageSquare, Send, Plus, Bot, User, BookOpen, AlertTriangle } from 'lucide-react';

export default function ChatbotView() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);

  const fetchSessions = async () => {
    setFetchingHistory(true);
    try {
      const res = await api.get('/chat/sessions');
      const sList = res.data || [];
      setSessions(sList);
      if (sList.length > 0 && !currentSessionId) {
        setCurrentSessionId(sList[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const createNewSession = async () => {
    try {
      const res = await api.post('/chat/sessions', { title: 'New Conversation' });
      const newS = res.data;
      setSessions([newS, ...sessions]);
      setCurrentSessionId(newS.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create chat session:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt.trim();
    setPrompt('');

    // Append user message immediately
    const userMsg = { sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        session_id: currentSessionId,
        prompt: userText
      });

      const responseData = res.data;
      if (!currentSessionId && responseData.session_id) {
        setCurrentSessionId(responseData.session_id);
      }

      const botMsg = {
        sender: 'bot',
        answer: responseData.answer,
        mode: responseData.mode,
        citations: responseData.citations || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          answer: err.response?.data?.detail || 'Failed to receive response from AI service.',
          mode: 'error',
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', height: 'calc(100vh - 120px)' }}>
      
      {/* Session History Sidebar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
          onClick={createNewSession}
        >
          <Plus size={16} /> New Chat
        </button>

        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>
          CHAT SESSIONS
        </div>

        {fetchingHistory ? (
          <LoadingSpinner label="Loading..." />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  setMessages([]);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: currentSessionId === s.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: `1px solid ${currentSessionId === s.id ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`,
                  color: currentSessionId === s.id ? '#f8fafc' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={14} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.title || `Session #${s.id}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Stream */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={22} color="#3b82f6" />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>A.S.T.R.A Resident RAG AI Concierge</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Ask questions regarding society rules, visitor policies, and parking setup.</p>
          </div>
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px', marginBottom: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b' }}>
              <Bot size={48} color="#334155" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '14px' }}>Start typing to ask questions to the RAG Knowledge Engine.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.sender === 'bot' && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={18} color="#ffffff" />
                  </div>
                )}

                <div style={{
                  maxWidth: '80%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' ? '#1d4ed8' : 'rgba(15, 23, 42, 0.8)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {/* Explicit Retrieval-Only Fallback Banner */}
                  {msg.sender === 'bot' && msg.mode === 'retrieval_only_fallback' && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fbbf24',
                      fontSize: '12px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertTriangle size={14} />
                      <span>
                        Retrieval-only mode — response generated from retrieved society documents. LLM generation is currently unavailable.
                      </span>
                    </div>
                  )}

                  <div>{msg.answer || msg.text}</div>

                  {/* Document Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', color: '#94a3b8' }}>
                      <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', marginBottom: '4px' }}>
                        <BookOpen size={12} /> Sources & Citations:
                      </div>
                      {msg.citations.map((c, cIdx) => (
                        <div key={cIdx} style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '2px' }}>
                          • {c.title || c.filename || 'Document Source'} (Relevance: {c.score ? Math.round(c.score * 100) + '%' : 'High'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color="#ffffff" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#3b82f6" />
              <span>Querying RAG Vector Index...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Ask AI Concierge about parking rules, guest passes..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
            <Send size={16} /> Send
          </button>
        </form>

      </div>
    </div>
  );
}
