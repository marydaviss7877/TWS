import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, ArrowUpTrayIcon, CheckIcon,
  EyeIcon, LinkIcon, PlusIcon, TrashIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import * as portfolioApi from './portfolioApi';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const emptyMetric = { label: '', value: '', context: '' };
const splitList = value => value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 30);

function Field({ label, hint, children }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}</label>;
}

export default function PortfolioEditor() {
  const { id } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const { hasModulePermission } = useTenantPermissions();
  const canWrite = hasModulePermission('portfolio', 'write') || hasModulePermission('portfolio', 'admin');
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    portfolioApi.getItem(tenantSlug, id).then(data => active && setItem(data)).catch(err => active && setError(err.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tenantSlug, id]);

  useEffect(() => {
    const warn = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const completion = useMemo(() => {
    if (!item) return 0;
    const signals = [item.title, item.summary, item.challenge, item.approach, item.solution, item.outcome, item.coverAssetId || item.assets?.length, item.metrics?.length];
    return Math.round((signals.filter(Boolean).length / signals.length) * 100);
  }, [item]);

  const update = (field, value) => {
    setDirty(true);
    setItem(current => ({ ...current, [field]: value }));
  };
  const updateNested = (field, key, value) => {
    setDirty(true);
    setItem(current => ({ ...current, [field]: { ...(current[field] || {}), [key]: value } }));
  };

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = {
        title: item.title, slug: item.slug, summary: item.summary, type: item.type,
        client: item.client, services: item.services, technologies: item.technologies, tags: item.tags,
        challenge: item.challenge, approach: item.approach, solution: item.solution, outcome: item.outcome,
        metrics: item.metrics, testimonial: item.testimonial, blocks: item.blocks,
        coverAssetId: item.coverAssetId || null, featured: item.featured, projectDate: item.projectDate,
        seo: item.seo, visibility: item.visibility || { scope: 'sales', visibleFrom: null, visibleUntil: null }
      };
      const saved = await portfolioApi.updateItem(tenantSlug, id, payload);
      setItem(current => ({ ...current, ...saved }));
      setDirty(false);
      setNotice('Saved');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally { setSaving(false); }
  };

  const publish = async () => {
    const savedSuccessfully = await save();
    if (!savedSuccessfully) return;
    try {
      const saved = await portfolioApi.setStatus(tenantSlug, id, item.status === 'published' ? 'draft' : 'published');
      setItem(current => ({ ...current, ...saved }));
      setNotice(saved.status === 'published' ? 'Published to the internal portfolio library' : 'Moved back to draft');
    } catch (err) { setError(err.message); }
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    if (isImage && file.size > 5 * 1024 * 1024) return setError('Images must be 5 MB or smaller.');
    if (!isImage && !file.type.startsWith('video/') && file.size > 25 * 1024 * 1024) return setError('Documents must be 25 MB or smaller.');
    setUploading(true); setError('');
    try {
      const updated = await portfolioApi.uploadAsset(tenantSlug, id, file, { altText: file.name.replace(/\.[^.]+$/, '') });
      const newest = updated.assets?.[updated.assets.length - 1];
      setItem(current => ({ ...current, ...updated, coverAssetId: current.coverAssetId || newest?._id }));
      setNotice('Media uploaded');
    } catch (err) {
      setError(err.status === 429 ? `Too many uploads. Try again${err.retryAfter ? ` in ${err.retryAfter}s` : ' shortly'}.` : err.message);
    } finally { setUploading(false); }
  };

  const addMetric = () => update('metrics', [...(item.metrics || []), { ...emptyMetric }]);
  const changeMetric = (index, key, value) => update('metrics', item.metrics.map((metric, i) => i === index ? { ...metric, [key]: value } : metric));
  const removeMetric = index => update('metrics', item.metrics.filter((_, i) => i !== index));

  const removeAsset = async assetId => {
    if (!window.confirm('Remove this media asset from the portfolio item?')) return;
    try {
      await portfolioApi.removeAsset(tenantSlug, id, assetId);
      setItem(current => ({
        ...current,
        assets: current.assets.filter(asset => String(asset._id) !== String(assetId)),
        coverAssetId: String(current.coverAssetId) === String(assetId) ? null : current.coverAssetId,
        blocks: (current.blocks || []).map(block => ({ ...block, assetIds: (block.assetIds || []).filter(value => String(value) !== String(assetId)) }))
      }));
      setNotice('Media removed');
    } catch (err) { setError(err.message); }
  };

  const addEmbed = () => {
    if (!embedUrl.trim()) return;
    update('blocks', [...(item.blocks || []), { type: 'embed', title: 'Video walkthrough', embed: { url: embedUrl.trim() }, order: item.blocks?.length || 0 }]);
    setEmbedUrl('');
  };

  const addBlock = type => {
    const block = {
      type,
      title: type === 'heading' ? 'New section' : '',
      body: type === 'quote' ? 'Add a meaningful quote or learning.' : '',
      assetIds: [],
      cta: type === 'cta' ? { label: 'Open resource', url: '' } : undefined,
      order: item.blocks?.length || 0
    };
    update('blocks', [...(item.blocks || []), block]);
  };
  const updateBlock = (index, changes) => update('blocks', item.blocks.map((block, i) => i === index ? { ...block, ...changes } : block));
  const removeBlock = index => update('blocks', item.blocks.filter((_, i) => i !== index));
  const moveBlock = (index, direction) => {
    const destination = index + direction;
    if (destination < 0 || destination >= item.blocks.length) return;
    const blocks = [...item.blocks];
    [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]];
    update('blocks', blocks.map((block, order) => ({ ...block, order })));
  };

  if (loading) return <div className="min-h-full bg-slate-50 p-12 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Loading editor…</div>;
  if (!item) return <div className="min-h-full bg-slate-50 p-12 text-center text-red-600 dark:bg-slate-950 dark:text-red-400">{error || 'Portfolio item not found'}</div>;

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-accent-500 dark:focus:ring-accent-500/20';
  const textarea = `${input} min-h-[130px] resize-y leading-6`;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(`/${tenantSlug}/org/portfolio`)} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"><ArrowLeftIcon className="h-5 w-5" /> Portfolio</button>
          <div className="hidden items-center gap-3 md:flex"><span className="text-xs text-slate-500 dark:text-slate-400">Story completeness</span><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-accent-500" style={{ width: `${completion}%` }} /></div><span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{completion}%</span></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(`/${tenantSlug}/org/portfolio/${id}`)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"><EyeIcon className="h-4 w-4" /> Preview</button>
            <button type="button" onClick={save} disabled={saving || !canWrite} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
            <button type="button" onClick={publish} disabled={!canWrite} className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40 ${item.status === 'published' ? 'bg-slate-700 hover:bg-slate-800' : 'bg-accent-600 hover:bg-accent-700'}`}>{item.status === 'published' ? 'Return to draft' : 'Publish internally'}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_310px]">
        <main className="space-y-6">
          {!canWrite && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">You have read-only portfolio access. Use Preview to view this story.</div>}
          {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}><span>{error || notice}</span><button type="button" onClick={() => { setError(''); setNotice(''); }}><XMarkIcon className="h-4 w-4" /></button></div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">The snapshot</p><h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Make the value obvious</h1></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.status}</span></div>
            <div className="space-y-5">
              <Field label="Title"><input className={input} maxLength={180} value={item.title || ''} onChange={e => update('title', e.target.value)} placeholder="How we increased activation by 42%" /></Field>
              <Field label="One-line outcome" hint="Lead with the result, not the deliverable."><textarea className={`${input} min-h-[90px]`} maxLength={600} value={item.summary || ''} onChange={e => update('summary', e.target.value)} placeholder="A concise statement of the client, problem, work, and measurable impact." /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Client"><input className={input} value={item.client?.name || ''} onChange={e => updateNested('client', 'name', e.target.value)} placeholder="Client or NDA-safe label" /></Field>
                <Field label="Industry"><input className={input} value={item.client?.industry || ''} onChange={e => updateNested('client', 'industry', e.target.value)} placeholder="Fintech, SaaS, healthcare…" /></Field>
                <Field label="Client website"><input className={input} value={item.client?.website || ''} onChange={e => updateNested('client', 'website', e.target.value)} placeholder="https://…" /></Field>
                <Field label="Project date"><input type="date" className={input} value={item.projectDate ? String(item.projectDate).slice(0, 10) : ''} onChange={e => update('projectDate', e.target.value || null)} /></Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={Boolean(item.client?.confidential)} onChange={e => updateNested('client', 'confidential', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-accent-600 dark:border-slate-700 dark:bg-slate-950" /> Client identity is confidential / NDA-protected</label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">The story</p><h2 className="mb-6 mt-1 text-xl font-bold text-slate-950 dark:text-white">Context → decisions → impact</h2>
            <div className="space-y-6">
              <Field label="1. Challenge" hint="What was at stake? Include constraints and the starting baseline."><textarea className={textarea} value={item.challenge || ''} onChange={e => update('challenge', e.target.value)} /></Field>
              <Field label="2. Approach" hint="Explain the reasoning, research, collaboration, and trade-offs."><textarea className={textarea} value={item.approach || ''} onChange={e => update('approach', e.target.value)} /></Field>
              <Field label="3. Solution" hint="Describe what changed and why it solved the problem."><textarea className={textarea} value={item.solution || ''} onChange={e => update('solution', e.target.value)} /></Field>
              <Field label="4. Outcome" hint="Use verified numbers, time saved, revenue, quality, adoption, or a clear qualitative result."><textarea className={textarea} value={item.outcome || ''} onChange={e => update('outcome', e.target.value)} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">Proof</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Measurable results</h2></div><button type="button" onClick={addMetric} className="flex items-center gap-1.5 rounded-lg border border-accent-200 px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50 dark:border-accent-500/40 dark:text-accent-300 dark:hover:bg-accent-500/10"><PlusIcon className="h-4 w-4" /> Metric</button></div>
            <div className="space-y-3">
              {(item.metrics || []).map((metric, index) => <div key={metric._id || index} className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 md:grid-cols-[1fr_140px_1.5fr_auto]">
                <input aria-label="Metric label" className={input} value={metric.label} onChange={e => changeMetric(index, 'label', e.target.value)} placeholder="Activation rate" />
                <input aria-label="Metric value" className={input} value={metric.value} onChange={e => changeMetric(index, 'value', e.target.value)} placeholder="+42%" />
                <input aria-label="Metric context" className={input} value={metric.context} onChange={e => changeMetric(index, 'context', e.target.value)} placeholder="Within 90 days" />
                <button type="button" onClick={() => removeMetric(index)} className="p-2 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400" aria-label="Remove metric"><TrashIcon className="h-5 w-5" /></button>
              </div>)}
              {!item.metrics?.length && <p className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Add one to three decision-useful metrics. Quality beats a wall of vanity numbers.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">Media</p><h2 className="mb-2 mt-1 text-xl font-bold text-slate-950 dark:text-white">Show the work in context</h2><p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Images up to 5 MB, documents up to 25 MB, or MP4/WebM/MOV video up to 100 MB.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(item.assets || []).map(asset => <div key={asset._id} className={`relative overflow-hidden rounded-xl border-2 ${String(item.coverAssetId) === String(asset._id) ? 'border-accent-500' : 'border-transparent bg-slate-100 dark:bg-slate-800'}`}>
                <button type="button" onClick={() => update('coverAssetId', asset._id)} className="block w-full text-left">
                  {asset.kind === 'image' ? <img src={asset.url} alt={asset.altText || ''} className="aspect-video w-full object-cover" /> : asset.kind === 'video' ? <video src={asset.url} muted preload="metadata" className="aspect-video w-full bg-black object-cover" /> : <div className="flex aspect-video items-center justify-center bg-slate-100 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{asset.kind}</div>}
                  <div className="truncate p-2 pr-9 text-xs text-slate-600 dark:text-slate-300">{asset.originalName}</div>
                </button>
                <button type="button" onClick={() => removeAsset(asset._id)} className="absolute bottom-1 right-1 rounded-md bg-white/90 p-1.5 text-slate-500 shadow hover:text-red-600 dark:bg-slate-900/90 dark:text-slate-300" aria-label={`Remove ${asset.originalName}`}><TrashIcon className="h-4 w-4" /></button>
                {String(item.coverAssetId) === String(asset._id) && <span className="absolute right-2 top-2 rounded-full bg-accent-600 p-1 text-white"><CheckIcon className="h-4 w-4" /></span>}
              </div>)}
              <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center hover:border-accent-300 hover:bg-accent-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-accent-500 dark:hover:bg-accent-500/10">
                <ArrowUpTrayIcon className="h-7 w-7 text-accent-500 dark:text-accent-400" /><span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{uploading ? 'Uploading…' : 'Upload media'}</span><input type="file" className="sr-only" disabled={uploading || !canWrite} onChange={upload} accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.mp3,.wav,.pdf,.doc,.docx,.ppt,.pptx,.zip" />
              </label>
            </div>
            <div className="mt-5 flex gap-2"><input className={input} value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Paste a Loom, YouTube, Vimeo, or Figma URL" /><button type="button" onClick={addEmbed} className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"><LinkIcon className="h-4 w-4" /> Add</button></div>
            {(item.blocks || []).filter(block => block.type === 'embed').map((block, index) => <div key={block._id || index} className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"><span className="truncate text-slate-600 dark:text-slate-300">{block.embed?.url}</span><button type="button" onClick={() => update('blocks', item.blocks.filter(candidate => candidate !== block))} aria-label="Remove embed"><XMarkIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /></button></div>)}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">Story builder</p>
            <div className="mb-5 mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-xl font-bold text-slate-950 dark:text-white">Supporting content blocks</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add context beyond the core case-study structure and reorder it for the viewer.</p></div>
              <select aria-label="Add content block" defaultValue="" onChange={event => { if (event.target.value) addBlock(event.target.value); event.target.value = ''; }} className={`${input} sm:w-48`}>
                <option value="" disabled>Add a block…</option><option value="heading">Heading</option><option value="text">Text</option><option value="quote">Quote</option><option value="image">Image</option><option value="video">Video</option><option value="gallery">Gallery</option><option value="document">Document</option><option value="divider">Divider</option><option value="cta">Call to action</option>
              </select>
            </div>
            <div className="space-y-3">
              {(item.blocks || []).map((block, index) => <div key={block._id || `${block.type}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-md bg-accent-100 px-2 py-1 text-xs font-bold uppercase text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">{block.type}</span>
                  <span className="text-xs text-slate-400">#{index + 1}</span>
                  <div className="ml-auto flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)} className="rounded p-1.5 text-slate-400 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Move block up"><ArrowUpIcon className="h-4 w-4" /></button>
                    <button type="button" disabled={index === item.blocks.length - 1} onClick={() => moveBlock(index, 1)} className="rounded p-1.5 text-slate-400 hover:bg-white disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Move block down"><ArrowDownIcon className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removeBlock(index)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Remove block"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
                {block.type === 'embed' ? <p className="truncate text-sm text-slate-600 dark:text-slate-300">{block.embed?.url}</p> : block.type === 'divider' ? <hr className="my-3 border-slate-300 dark:border-slate-700" /> : ['image', 'video', 'gallery', 'document'].includes(block.type) ? <div>
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Select media to include:</p>
                  <div className="flex flex-wrap gap-2">{(item.assets || []).filter(asset => block.type === 'gallery' || block.type === 'image' ? asset.kind === 'image' : block.type === 'video' ? asset.kind === 'video' : asset.kind === 'document').map(asset => {
                    const selected = (block.assetIds || []).some(value => String(value) === String(asset._id));
                    return <button type="button" key={asset._id} onClick={() => updateBlock(index, { assetIds: selected ? block.assetIds.filter(value => String(value) !== String(asset._id)) : [...(block.assetIds || []), asset._id] })} className={`rounded-lg border px-2.5 py-1.5 text-xs ${selected ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-slate-200 dark:border-slate-700'}`}>{asset.originalName}</button>;
                  })}</div>
                </div> : block.type === 'cta' ? <div className="grid gap-2 sm:grid-cols-2"><input className={input} value={block.cta?.label || ''} onChange={event => updateBlock(index, { cta: { ...(block.cta || {}), label: event.target.value } })} placeholder="Button label" /><input className={input} value={block.cta?.url || ''} onChange={event => updateBlock(index, { cta: { ...(block.cta || {}), url: event.target.value } })} placeholder="https://…" /></div> : <div className="space-y-2">
                  {block.type === 'heading' && <input className={input} value={block.title || ''} onChange={event => updateBlock(index, { title: event.target.value })} placeholder="Section heading" />}
                  {block.type !== 'heading' && <textarea className={`${input} min-h-[90px]`} value={block.body || ''} onChange={event => updateBlock(index, { body: event.target.value })} placeholder={block.type === 'quote' ? 'Quote or learning…' : 'Supporting story content…'} />}
                </div>}
              </div>)}
              {!item.blocks?.length && <p className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No supporting blocks yet. The core challenge, approach, solution, and outcome will still render.</p>}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Classification</h2>
            <div className="mt-4 space-y-4">
              <Field label="Format"><select className={input} value={item.type} onChange={e => update('type', e.target.value)}><option value="case_study">Case study</option><option value="project">Project</option><option value="showcase">Showcase</option><option value="testimonial">Testimonial</option><option value="resource">Resource</option></select></Field>
              <Field label="Services" hint="Comma-separated"><input className={input} value={(item.services || []).join(', ')} onChange={e => update('services', splitList(e.target.value))} placeholder="Product design, Development" /></Field>
              <Field label="Technologies" hint="Comma-separated"><input className={input} value={(item.technologies || []).join(', ')} onChange={e => update('technologies', splitList(e.target.value))} placeholder="React, Node.js, AWS" /></Field>
              <Field label="Tags" hint="Comma-separated"><input className={input} value={(item.tags || []).join(', ')} onChange={e => update('tags', splitList(e.target.value))} /></Field>
              <label className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><input type="checkbox" checked={Boolean(item.featured)} onChange={e => update('featured', e.target.checked)} className="h-4 w-4 rounded border-amber-300 text-accent-600 dark:border-amber-700 dark:bg-slate-900" /> Feature this work</label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Internal visibility</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">This library is never public. Choose which authenticated colleagues can discover this entry.</p>
            <div className="mt-4 space-y-4">
              <Field label="Audience">
                <select className={input} value={item.visibility?.scope || 'sales'} onChange={e => updateNested('visibility', 'scope', e.target.value)}>
                  <option value="sales">Sales / GTM teams</option>
                  <option value="organization">Entire organization</option>
                </select>
              </Field>
              {item.client?.confidential && item.visibility?.scope === 'organization' && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">NDA-protected entries are automatically restricted to Sales / GTM when saved.</p>}
              <Field label="Show from" hint="Optional. Leave empty to show immediately after publishing."><input type="datetime-local" className={input} value={item.visibility?.visibleFrom ? String(item.visibility.visibleFrom).slice(0, 16) : ''} onChange={e => updateNested('visibility', 'visibleFrom', e.target.value || null)} /></Field>
              <Field label="Hide after" hint="Optional. The item automatically disappears from reader views."><input type="datetime-local" className={input} value={item.visibility?.visibleUntil ? String(item.visibility.visibleUntil).slice(0, 16) : ''} onChange={e => updateNested('visibility', 'visibleUntil', e.target.value || null)} /></Field>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Client voice</h2>
            <div className="mt-4 space-y-3">
              <textarea className={`${input} min-h-[100px]`} maxLength={2000} value={item.testimonial?.quote || ''} onChange={e => updateNested('testimonial', 'quote', e.target.value)} placeholder="A concise, approved testimonial…" />
              <input className={input} value={item.testimonial?.author || ''} onChange={e => updateNested('testimonial', 'author', e.target.value)} placeholder="Name" />
              <input className={input} value={item.testimonial?.role || ''} onChange={e => updateNested('testimonial', 'role', e.target.value)} placeholder="Role, company" />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Internal discovery</h2>
            <div className="mt-4 space-y-3">
              <Field label="URL slug"><input className={input} value={item.slug || ''} onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></Field>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">The slug is an internal stable identifier. Tags, services, technologies, and summary power organization search and filtering.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
