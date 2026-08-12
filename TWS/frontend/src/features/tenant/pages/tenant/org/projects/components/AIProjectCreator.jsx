import React, { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';

const AIProjectCreator = ({ tenantSlug, onDraftReady }) => {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');

  const canSend = message.trim().length >= 2 && !isThinking;
  const assistantText = useMemo(() => {
    if (!result) return '';
    const questions = Array.isArray(result.questions) ? result.questions : [];
    return [result.assistantMessage, ...questions].filter(Boolean).join('\n');
  }, [result]);

  const submitMessage = async (event) => {
    event?.preventDefault();
    if (!canSend) return;

    const userText = message.trim();
    const priorHistory = history;
    setMessage('');
    setError('');
    setIsThinking(true);

    try {
      const response = await tenantProjectApiService.scopeProjectWithAI(tenantSlug, {
        message: userText,
        history: priorHistory,
        currentDraft: result?.project || undefined
      });
      const nextAssistantText = [
        response.assistantMessage,
        ...(Array.isArray(response.questions) ? response.questions : [])
      ].filter(Boolean).join('\n');

      setHistory([
        ...priorHistory,
        { role: 'user', text: userText },
        { role: 'assistant', text: nextAssistantText }
      ].slice(-10));
      setResult(response);

      if (response.state === 'ready' && response.project) {
        onDraftReady(response.project, response);
      } else {
        onDraftReady(null, response);
      }
    } catch (requestError) {
      setMessage(userText);
      setError(requestError.message || 'AI project planning is temporarily unavailable.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-210px)]">
      <div className="rounded-2xl border border-violet-200/70 bg-violet-50/70 p-4 dark:border-violet-800/60 dark:bg-violet-950/20">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-600 p-2 text-white">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Describe the project in your own words</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Include the outcome you want. If an essential detail is missing, the agent will ask a focused question before preparing the project.
            </p>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-5 space-y-3" aria-live="polite">
          {history.map((turn, index) => (
            <div
              key={`${turn.role}-${index}`}
              className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                turn.role === 'user'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {turn.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {isThinking && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Reviewing the scope…
        </div>
      )}

      {result?.state === 'ready' && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircleIcon className="h-5 w-5" />
            <h3 className="font-semibold">Scope ready for review</h3>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">Project</dt>
              <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">{result.project?.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{String(result.project?.projectType || 'general').replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Priority</dt>
              <dd className="mt-0.5 capitalize text-gray-800 dark:text-gray-200">{result.project?.priority || 'medium'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">Final scope</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6 text-gray-800 dark:text-gray-200">
                {result.scopeSummary || result.project?.description}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-emerald-700/80 dark:text-emerald-300/80">
            Nothing has been created yet. Use “Create scoped project” below to approve this action.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submitMessage} className="mt-5">
        <label htmlFor="ai-project-message" className="sr-only">Project request or answer</label>
        <div className="relative">
          <textarea
            id="ai-project-message"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 4000))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitMessage(event);
              }
            }}
            rows="4"
            className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder={result?.state === 'clarify' ? 'Answer the questions above…' : 'Example: Build a client portal for Acme where customers can track deliverables and approve work…'}
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="absolute bottom-3 right-3 rounded-xl bg-violet-600 p-2 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send to project agent"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>{message.length}/4000</span>
        </div>
      </form>

      {assistantText && <span className="sr-only" aria-live="polite">{assistantText}</span>}
    </div>
  );
};

export default AIProjectCreator;
