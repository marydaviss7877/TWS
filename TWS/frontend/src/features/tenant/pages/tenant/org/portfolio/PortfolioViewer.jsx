import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon, ArrowTopRightOnSquareIcon, DocumentIcon, PencilSquareIcon,
  ArchiveBoxIcon, Square2StackIcon, TrashIcon
} from '@heroicons/react/24/outline';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import * as portfolioApi from './portfolioApi';

function Media({ asset }) {
  if (!asset) return null;
  if (asset.kind === 'image') return <img src={asset.url} alt={asset.altText || ''} className="max-h-[680px] w-full rounded-2xl object-contain" />;
  if (asset.kind === 'video') return <video src={asset.url} controls preload="metadata" className="max-h-[680px] w-full rounded-2xl bg-black">Your browser does not support video playback.</video>;
  if (asset.kind === 'audio') return <audio src={asset.url} controls className="w-full" />;
  return <a href={asset.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-slate-700 dark:text-violet-300 dark:hover:bg-violet-500/10"><DocumentIcon className="h-6 w-6" /> {asset.originalName}<ArrowTopRightOnSquareIcon className="ml-auto h-4 w-4" /></a>;
}

export default function PortfolioViewer() {
  const { tenantSlug, id } = useParams();
  const navigate = useNavigate();
  const { hasModulePermission } = useTenantPermissions();
  const canWrite = hasModulePermission('portfolio', 'write') || hasModulePermission('portfolio', 'admin');
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    portfolioApi.getItem(tenantSlug, id).then(setItem).catch(err => setError(err.message));
  }, [tenantSlug, id]);

  const assetMap = useMemo(() => new Map((item?.assets || []).map(asset => [String(asset._id), asset])), [item]);
  const cover = item ? assetMap.get(String(item.coverAssetId)) : null;

  const duplicate = async () => {
    setBusy(true);
    try {
      const clone = await portfolioApi.duplicateItem(tenantSlug, id);
      navigate(`/${tenantSlug}/org/portfolio/${clone._id}/edit`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const archive = async () => {
    setBusy(true);
    try {
      const updated = await portfolioApi.setStatus(tenantSlug, id, 'archived');
      setItem(updated);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this portfolio item? It will be removed from the organization library.')) return;
    setBusy(true);
    try {
      await portfolioApi.removeItem(tenantSlug, id);
      navigate(`/${tenantSlug}/org/portfolio`);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  if (error) return <div className="min-h-full bg-slate-50 p-10 text-red-600 dark:bg-slate-950 dark:text-red-400">{error}</div>;
  if (!item) return <div className="min-h-full bg-slate-50 p-10 text-slate-500 dark:bg-slate-950 dark:text-slate-400">Loading portfolio story…</div>;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(`/${tenantSlug}/org/portfolio`)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><ArrowLeftIcon className="h-5 w-5" /> Portfolio</button>
          {canWrite && <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={duplicate} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"><Square2StackIcon className="h-4 w-4" /> Duplicate</button>
            <button type="button" disabled={busy || item.status === 'archived'} onClick={archive} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"><ArchiveBoxIcon className="h-4 w-4" /> Archive</button>
            <button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10" aria-label="Delete portfolio item"><TrashIcon className="h-4 w-4" /></button>
            <button type="button" onClick={() => navigate(`/${tenantSlug}/org/portfolio/${id}/edit`)} className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"><PencilSquareIcon className="h-4 w-4" /> Edit</button>
          </div>}
        </div>
      </header>

      <article className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{item.type.replace('_', ' ')}</span>
            {item.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Featured</span>}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">{item.title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{item.summary}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">{(item.services || []).map(value => <span key={value} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{value}</span>)}</div>
        </div>

        {cover && <div className="mt-12"><Media asset={cover} /></div>}

        {(item.metrics || []).length > 0 && <section className="my-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {item.metrics.map(metric => <div key={metric._id} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-3xl font-black text-violet-600 dark:text-violet-400">{metric.value}</div><div className="mt-2 font-semibold">{metric.label}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.context}</div>
          </div>)}
        </section>}

        <div className="mx-auto max-w-3xl space-y-12">
          {[['Challenge', item.challenge], ['Approach', item.approach], ['Solution', item.solution], ['Outcome', item.outcome]].filter(([, body]) => body).map(([title, body]) => <section key={title}><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">{title}</p><p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-slate-700 dark:text-slate-300">{body}</p></section>)}

          {(item.blocks || []).map(block => {
            if (block.type === 'embed' && block.embed?.embedUrl) return <section key={block._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800"><div className="aspect-video"><iframe src={block.embed.embedUrl} title={block.title || `${block.embed.provider} embed`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div></section>;
            if (['image', 'video', 'document', 'gallery'].includes(block.type)) return <section key={block._id} className="grid gap-4">{(block.assetIds || []).map(assetId => <Media key={assetId} asset={assetMap.get(String(assetId))} />)}</section>;
            if (block.type === 'divider') return <hr key={block._id} className="border-slate-200 dark:border-slate-800" />;
            if (block.type === 'cta' && block.cta?.url) return <a key={block._id} href={block.cta.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white">{block.cta.label || 'Open resource'}<ArrowTopRightOnSquareIcon className="h-4 w-4" /></a>;
            if (block.type === 'heading') return <h2 key={block._id} className="text-2xl font-bold">{block.title || block.body}</h2>;
            if (block.type === 'quote') return <blockquote key={block._id} className="border-l-4 border-violet-500 pl-6 text-xl italic leading-8 text-slate-700 dark:text-slate-300">{block.body}</blockquote>;
            return block.body ? <p key={block._id} className="whitespace-pre-wrap text-lg leading-8 text-slate-700 dark:text-slate-300">{block.body}</p> : null;
          })}

          {item.testimonial?.quote && <blockquote className="rounded-3xl bg-violet-600 p-8 text-white"><p className="text-xl font-medium leading-8">“{item.testimonial.quote}”</p><footer className="mt-5 text-sm text-violet-100">{item.testimonial.author}{item.testimonial.role ? ` — ${item.testimonial.role}` : ''}</footer></blockquote>}
        </div>

        {(item.assets || []).filter(asset => String(asset._id) !== String(item.coverAssetId)).length > 0 && <section className="mt-16"><h2 className="mb-5 text-2xl font-bold">Project media</h2><div className="grid gap-5 md:grid-cols-2">{item.assets.filter(asset => String(asset._id) !== String(item.coverAssetId)).map(asset => <Media key={asset._id} asset={asset} />)}</div></section>}
      </article>
    </div>
  );
}
