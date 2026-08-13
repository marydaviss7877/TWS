import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const starterMessages = [
  'Show me projects that need attention',
  'Create a task from my description',
  'Find work related to a client',
  'Give me a workspace summary'
];

const NucleusAgent = ({ tenantSlug }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    try { return sessionStorage.getItem(`nucleus-conversation-${tenantSlug}`) || ''; } catch (_) { return ''; }
  });
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction, loading, open]);

  useEffect(() => {
    if (!open || !conversationId || historyLoaded || messages.length) return;
    let active = true;
    request(`/api/tenant/${tenantSlug}/organization/agent/conversations/${conversationId}`)
      .then((data) => {
        if (!active) return;
        setMessages(data.messages || []);
        setPendingAction(data.pendingAction || null);
      })
      .catch(() => {
        if (!active) return;
        setConversationId('');
        try { sessionStorage.removeItem(`nucleus-conversation-${tenantSlug}`); } catch (_) {}
      })
      .finally(() => { if (active) setHistoryLoaded(true); });
    return () => { active = false; };
  // `request` is intentionally local; this effect is keyed by the persisted conversation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId, historyLoaded, messages.length, tenantSlug]);

  const moduleName = location.pathname.split('/').filter(Boolean).pop() || 'home';

  const request = async (url, options) => {
    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      response = await fetch(url, { ...options, signal: controller.signal, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Nucleus timed out. Please try again.');
      if (!navigator.onLine || /Failed to fetch|NetworkError/i.test(error.message)) {
        throw new Error('You appear to be offline. Reconnect to the internet and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Nucleus could not complete the request.');
    return payload.data;
  };

  const send = async (event, suggestedText) => {
    event?.preventDefault();
    const text = String(suggestedText || input).trim();
    if (text.length < 2 || loading) return;
    setInput('');
    setPendingAction(null);
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const data = await request(`/api/tenant/${tenantSlug}/organization/agent/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
          pageContext: { pathname: location.pathname, module: moduleName }
        })
      });
      setConversationId(data.conversationId);
      try { sessionStorage.setItem(`nucleus-conversation-${tenantSlug}`, data.conversationId); } catch (_) {}
      setMessages((current) => [...current, { role: 'assistant', content: data.message, activity: data.activity || [] }]);
      setPendingAction(data.pendingAction || null);
    } catch (error) {
      setMessages((current) => [...current, { role: 'error', content: error.message || 'Nucleus is temporarily unavailable.' }]);
    } finally {
      setLoading(false);
    }
  };

  const decide = async (decision) => {
    if (!pendingAction || loading) return;
    setLoading(true);
    try {
      const data = await request(`/api/tenant/${tenantSlug}/organization/agent/conversations/${conversationId}/actions/${pendingAction.id}`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      setMessages((current) => [...current, { role: 'assistant', content: data.message }]);
      setPendingAction(null);
    } catch (error) {
      setMessages((current) => [...current, { role: 'error', content: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setConversationId('');
    setMessages([]);
    setPendingAction(null);
    setHistoryLoaded(false);
    try { sessionStorage.removeItem(`nucleus-conversation-${tenantSlug}`); } catch (_) {}
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open && (
        <section
          className="mb-3 flex h-[min(680px,calc(100vh-110px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-950"
          aria-label="Nucleus agent"
        >
          <header className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Nucleus</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Your organization’s operational agent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={newConversation} className="rounded-xl px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" title="New conversation">New</button>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close Nucleus"><ChevronDownIcon className="h-5 w-5" /></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col justify-between">
                <div className="pt-7">
                  <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">What should we get done?</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Ask about work anywhere in TWS. I’ll inspect the right module, clarify uncertainty, and request approval before changing data.
                  </p>
                </div>
                <div className="space-y-2 pb-2">
                  {starterMessages.map((starter) => (
                    <button key={starter} onClick={(event) => send(event, starter)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : message.role === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100'
                  }`}>
                    {message.content}
                    {message.activity?.length > 0 && (
                      <div className="mt-2 border-t border-current/10 pt-2 text-[11px] opacity-60">
                        {message.activity.map((item) => item.toolName.replaceAll('_', ' ')).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {pendingAction && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Approval required</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{pendingAction.summary}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => decide('approve')} disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"><CheckIcon className="h-4 w-4" /> Approve</button>
                    <button onClick={() => decide('reject')} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-white/20 dark:text-slate-200"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" /> Nucleus is working…
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <form onSubmit={send} className="border-t border-slate-200/80 p-3 dark:border-white/10">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-slate-500 dark:border-white/15 dark:bg-white/5">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 4000))}
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }}
                rows="2"
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                placeholder="Ask Nucleus to find or do something…"
                disabled={loading}
              />
              <button type="submit" disabled={loading || input.trim().length < 2} className="mb-0.5 rounded-xl bg-slate-950 p-2.5 text-white disabled:opacity-30 dark:bg-white dark:text-slate-950" aria-label="Send"><PaperAirplaneIcon className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-slate-400">Nucleus can make mistakes. Review proposed changes before approval.</p>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-900/25 transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
        aria-label={open ? 'Close Nucleus' : 'Open Nucleus'}
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <SparklesIcon className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default NucleusAgent;
