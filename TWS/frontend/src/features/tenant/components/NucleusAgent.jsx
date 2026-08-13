import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BoltIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  Squares2X2Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const starterMessages = [
  { text: 'Show me projects that need attention', icon: BoltIcon },
  { text: 'Create a task from my description', icon: ClipboardDocumentListIcon },
  { text: 'Find work related to a client', icon: MagnifyingGlassIcon },
  { text: 'Give me a workspace summary', icon: Squares2X2Icon }
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
  const moduleLabel = moduleName.replaceAll('-', ' ').replaceAll('_', ' ');

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
    <div className="fixed bottom-3 right-3 z-[80] sm:bottom-5 sm:right-5">
      {open && (
        <section
          className="relative mb-3 flex h-[min(680px,calc(100dvh-98px))] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[28px] border border-blue-200/80 bg-white/95 shadow-[0_28px_80px_-28px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:h-[min(680px,calc(100dvh-110px))] sm:w-[420px] dark:border-blue-400/20 dark:bg-slate-950/95 dark:shadow-[0_28px_80px_-28px_rgba(30,64,175,0.5)]"
          aria-label="Nucleus agent"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/15" aria-hidden="true" />
          <header className="relative flex items-center justify-between border-b border-blue-100 bg-blue-50/70 px-4 py-3.5 dark:border-blue-400/15 dark:bg-blue-950/25">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.9)]">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">Nucleus</h2>
                  <span className="max-w-24 truncate rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" title={`Current module: ${moduleLabel}`}>
                    {moduleLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-blue-700/70 dark:text-blue-300/70">Operations, connected</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={newConversation} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-400/10" title="New conversation">New</button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-blue-700 transition-colors hover:bg-blue-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-400/10" aria-label="Close Nucleus"><ChevronDownIcon className="h-5 w-5" /></button>
            </div>
          </header>

          <div className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.11),transparent_34%)] px-4 py-4 dark:bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.12),transparent_38%)]">
            {messages.length === 0 && (
              <div className="flex h-full flex-col justify-between">
                <div className="pt-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
                    <BoltIcon className="h-5 w-5" />
                  </span>
                  <p className="max-w-[16rem] text-2xl font-bold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">What should we get done?</p>
                  <p className="mt-3 max-w-[34ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Ask about work anywhere in TWS. I’ll inspect the right module, clarify uncertainty, and request approval before changing data.
                  </p>
                </div>
                <div className="space-y-2 pb-1 pt-6">
                  {starterMessages.map(({ text, icon: StarterIcon }) => (
                    <button key={text} onClick={(event) => send(event, text)} className="group flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white/80 px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-[0_8px_24px_-20px_rgba(37,99,235,0.8)] transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-[0_14px_30px_-20px_rgba(37,99,235,0.9)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-400/15 dark:bg-blue-400/5 dark:text-slate-100 dark:hover:border-blue-400/35 dark:hover:bg-blue-400/10 dark:focus-visible:ring-offset-slate-950">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-400/15 dark:text-blue-300 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                        <StarterIcon className="h-4 w-4" />
                      </span>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[90%] items-end gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {message.role === 'assistant' && (
                      <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                        <SparklesIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-blue-600 text-white shadow-blue-700/15'
                        : message.role === 'error'
                          ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-700 shadow-red-900/5 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                          : 'rounded-bl-md border border-blue-100 bg-white text-slate-800 shadow-blue-900/5 dark:border-blue-400/15 dark:bg-blue-400/10 dark:text-slate-100'
                    }`}>
                      {message.content}
                      {message.activity?.length > 0 && (
                        <div className="mt-2 border-t border-current/10 pt-2 text-[11px] font-medium opacity-60">
                          {message.activity.map((item) => item.toolName.replaceAll('_', ' ')).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {pendingAction && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm shadow-amber-900/5 dark:border-amber-700/40 dark:bg-amber-950/30">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Approval required</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{pendingAction.summary}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => decide('approve')} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-950"><CheckIcon className="h-4 w-4" /> Approve</button>
                    <button onClick={() => decide('reject')} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 dark:border-amber-600/40 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-end gap-2" aria-live="polite" aria-label="Nucleus is working">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <SparklesIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex h-10 items-center gap-1 rounded-2xl rounded-bl-md border border-blue-100 bg-white px-4 shadow-sm shadow-blue-900/5 dark:border-blue-400/15 dark:bg-blue-400/10">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className={`h-1.5 w-1.5 rounded-full bg-blue-500 motion-safe:animate-bounce motion-reduce:animate-none ${dot === 1 ? '[animation-delay:120ms]' : dot === 2 ? '[animation-delay:240ms]' : ''}`} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <form onSubmit={send} className="relative border-t border-blue-100 bg-white/90 p-3 dark:border-blue-400/15 dark:bg-slate-950/90">
            <div className="flex items-end gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-2 transition-[border-color,box-shadow] duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-blue-400/20 dark:bg-blue-400/5 dark:focus-within:border-blue-400">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 4000))}
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }}
                rows="2"
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-slate-400"
                placeholder="Ask Nucleus to find or do something…"
                aria-label="Message Nucleus"
                disabled={loading}
              />
              <button type="submit" disabled={loading || input.trim().length < 2} className="mb-0.5 rounded-xl bg-blue-600 p-2.5 text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.9)] transition-[background-color,transform] hover:bg-blue-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none dark:focus-visible:ring-offset-slate-950" aria-label="Send message"><PaperAirplaneIcon className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">Review proposed changes before approval. Nucleus can make mistakes.</p>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/50 bg-blue-600 text-white shadow-[0_18px_38px_-14px_rgba(37,99,235,0.95)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-[0_22px_44px_-14px_rgba(37,99,235,0.95)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-300/30 dark:focus-visible:ring-offset-slate-950"
        aria-label={open ? 'Close Nucleus' : 'Open Nucleus'}
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <SparklesIcon className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default NucleusAgent;
