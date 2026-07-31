import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArchiveBoxIcon, PlusIcon, MagnifyingGlassIcon, StarIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import * as portfolioApi from './portfolioApi';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';

const statusStyle = {
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  draft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
};

export default function PortfolioHub() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { hasModulePermission } = useTenantPermissions();
  const canWrite = hasModulePermission('portfolio', 'write') || hasModulePermission('portfolio', 'admin');
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: '', type: '', featured: '', sort: 'curated', order: 'desc', search: '', page: 1, limit: 21 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await portfolioApi.listItems(tenantSlug, filters);
      setItems(data.items || []);
      setSelected(new Set());
      setPagination(data.pagination || { page: 1, pages: 1, total: data.items?.length || 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filters]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const create = async () => {
    try {
      const item = await portfolioApi.createItem(tenantSlug, { title: 'Untitled case study', type: 'case_study' });
      navigate(`/${tenantSlug}/org/portfolio/${item._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const runBulk = async action => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} selected portfolio items?`)) return;
    setBulkBusy(true);
    try {
      if (action === 'archive') await portfolioApi.bulkSetStatus(tenantSlug, ids, 'archived');
      else await portfolioApi.bulkDelete(tenantSlug, ids);
      await load();
    } catch (err) { setError(err.message); } finally { setBulkBusy(false); }
  };
  const toggleSelected = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="min-h-full bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Content studio</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Portfolio</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">A private, centralized proof library for Sales to find and use approved case studies, media, and walkthroughs. Nothing here is publicly accessible.</p>
          </div>
          {canWrite && <button type="button" onClick={create} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">
            <PlusIcon className="h-5 w-5" /> New case study
          </button>}
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(240px,1fr)_160px_150px_170px]">
          <label className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input aria-label="Search portfolio" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              placeholder="Search title, service, tag…" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
          </label>
          <select aria-label="Filter by type" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="">All types</option><option value="case_study">Case studies</option><option value="project">Projects</option><option value="showcase">Showcases</option><option value="testimonial">Testimonials</option><option value="resource">Resources</option>
          </select>
          <select aria-label="Filter by status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
          <select aria-label="Sort portfolio" value={`${filters.sort}:${filters.order}`} onChange={e => { const [sort, order] = e.target.value.split(':'); setFilters(f => ({ ...f, sort, order, page: 1 })); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="curated:desc">Curated order</option><option value="updatedAt:desc">Recently updated</option><option value="projectDate:desc">Newest project</option><option value="projectDate:asc">Oldest project</option><option value="title:asc">Title A–Z</option>
          </select>
        </div>
        <div className="-mt-3 mb-5 flex items-center gap-2">
          <button type="button" onClick={() => setFilters(f => ({ ...f, featured: f.featured === 'true' ? '' : 'true', page: 1 }))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filters.featured === 'true' ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>Featured only</button>
          <span className="text-xs text-slate-400">{pagination.total} result{pagination.total === 1 ? '' : 's'}</span>
        </div>
        {canWrite && selected.size > 0 && <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
          <span className="mr-auto text-sm font-semibold text-violet-800 dark:text-violet-200">{selected.size} selected</span>
          <button type="button" disabled={bulkBusy} onClick={() => runBulk('archive')} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"><ArchiveBoxIcon className="h-4 w-4" /> Archive</button>
          <button type="button" disabled={bulkBusy} onClick={() => runBulk('delete')} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"><TrashIcon className="h-4 w-4" /> Delete</button>
          <button type="button" onClick={() => setSelected(new Set())} className="px-2 text-sm text-slate-500 dark:text-slate-400">Clear</button>
        </div>}

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        {loading ? <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">Loading portfolio…</div> : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-900">
            <PhotoIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">Your best work deserves a story</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a case study, add measurable outcomes, and publish it when ready.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(item => (
              <div key={item._id} className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${selected.has(item._id) ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-200 dark:border-slate-800 dark:hover:border-slate-700'}`}>
                {canWrite && <label className="absolute left-3 top-3 z-10 flex cursor-pointer rounded-md bg-white/90 p-1.5 shadow dark:bg-slate-900/90"><input type="checkbox" checked={selected.has(item._id)} onChange={() => toggleSelected(item._id)} className="h-4 w-4 rounded border-slate-300 text-violet-600" aria-label={`Select ${item.title}`} /></label>}
                <button type="button" onClick={() => navigate(`/${tenantSlug}/org/portfolio/${item._id}`)} className="block w-full text-left">
                  <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-slate-100 dark:from-violet-950 dark:via-fuchsia-950/50 dark:to-slate-900">{item.cover?.kind === 'image' && item.cover.url ? <img src={item.cover.url} alt={item.cover.altText || ''} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : item.cover?.kind === 'video' && item.cover.url ? <video src={item.cover.url} muted preload="metadata" className="h-full w-full object-cover" /> : <PhotoIcon className="h-10 w-10 text-violet-300 dark:text-violet-500" />}</div>
                  <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[item.status]}`}>{item.status}</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{item.visibility?.scope === 'organization' ? 'Organization' : 'Sales / GTM'}</span></div>
                    {item.featured && <StarIcon className="h-5 w-5 fill-amber-400 text-amber-400" aria-label="Featured" />}
                  </div>
                  <h2 className="line-clamp-2 text-lg font-semibold text-slate-950 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-400">{item.title}</h2>
                  <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-slate-500 dark:text-slate-400">{item.summary || 'Add a concise outcome-led summary.'}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">{(item.services || []).slice(0, 3).map(service => <span key={service} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{service}</span>)}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
        {pagination.total > 0 && <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">Showing {(pagination.page - 1) * filters.limit + 1}–{Math.min(pagination.page * filters.limit, pagination.total)} of {pagination.total}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pagination.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Previous</button>
            <span className="px-2 text-sm text-slate-600 dark:text-slate-300">Page {pagination.page} of {pagination.pages}</span>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Next</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
