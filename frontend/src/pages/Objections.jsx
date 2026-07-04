import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Check, Trash2, Loader2, Sparkles } from 'lucide-react';
import { getAuthHeaders, isHR } from '../auth';

const API_BASE = 'http://localhost:8001/api';

const Objections = () => {
  const [objections, setObjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [stats, setStats] = useState({ unresolved_count: 0 });
  const [isDeleting, setIsDeleting] = useState(null);

  const fetchObjections = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `${API_BASE}/objections/`;
      const params = new URLSearchParams();
      if (filter === 'unresolved') params.append('unresolved_only', 'true');
      if (params.toString()) url += `?${params.toString()}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch objections');
      const data = await response.json();
      setObjections(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching objections:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!isHR()) return;
    try {
      const response = await fetch(`${API_BASE}/objections/stats/unresolved`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchObjections();
    fetchStats();
    if (isHR()) {
      const interval = setInterval(() => {
        fetchObjections();
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [filter]);

  const handleResolve = async (objectionId) => {
    if (!isHR()) return;
    try {
      setResolvingId(objectionId);
      const response = await fetch(`${API_BASE}/objections/${objectionId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ resolution_notes: resolutionNotes || null })
      });
      if (!response.ok) throw new Error('Failed to resolve objection');
      await fetchObjections();
      await fetchStats();
      setResolvingId(null);
      setResolutionNotes('');
      setExpandedId(null);
    } catch (err) {
      setError(err.message);
      setResolvingId(null);
      console.error('Error resolving objection:', err);
    }
  };

  const handleDelete = async (e, objectionId) => {
    if (!isHR()) return;
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this objection?')) return;
    try {
      setIsDeleting(objectionId);
      const response = await fetch(`${API_BASE}/objections/${objectionId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to delete objection');
      await fetchObjections();
      await fetchStats();
      setExpandedId(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting objection:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredObjections = objections.filter((obj) => {
    if (filter === 'resolved') return obj.is_resolved;
    if (filter === 'unresolved') return !obj.is_resolved;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100"><Sparkles className="h-4 w-4" />Review queue</div>
            <h1 className="text-3xl font-semibold tracking-tight">{isHR() ? 'Salary objections' : 'My objections'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Track salary-related concerns with a polished and structured review experience.</p>
          </div>
        </div>
      </div>

      {isHR() && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-card p-6"><p className="text-sm font-medium text-slate-500">Total objections</p><div className="mt-2 text-3xl font-semibold text-slate-900">{objections.length}</div></div>
          <div className="glass-card border-red-200 p-6"><p className="text-sm font-medium text-red-600">Unresolved</p><div className="mt-2 text-3xl font-semibold text-red-600">{stats.unresolved_count}</div></div>
          <div className="glass-card border-emerald-200 p-6"><p className="text-sm font-medium text-emerald-600">Resolved</p><div className="mt-2 text-3xl font-semibold text-emerald-600">{objections.length - stats.unresolved_count}</div></div>
        </div>
      )}

      <div className="glass-card p-2">
        <div className="flex flex-wrap gap-2">
          {[{ label: 'All', value: 'all' }, { label: 'Unresolved', value: 'unresolved' }, { label: 'Resolved', value: 'resolved' }].map((tab) => (
            <button key={tab.value} onClick={() => setFilter(tab.value)} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${filter === tab.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="glass-card p-12 text-center text-slate-500"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" /><p className="text-slate-600">Loading objections...</p></div>
      ) : filteredObjections.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500"><AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" /><p className="text-slate-600">{filter === 'unresolved' ? 'No unresolved objections.' : filter === 'resolved' ? 'No resolved objections yet.' : 'No objections found.'}</p></div>
      ) : (
        <div className="space-y-3">
          {filteredObjections.map((objection) => (
            <div key={objection.id} className={`rounded-[24px] border bg-white shadow-sm transition ${objection.is_resolved ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 hover:border-red-300'}`}>
              <button onClick={() => setExpandedId(expandedId === objection.id ? null : objection.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
                <div className="flex flex-1 items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${objection.is_resolved ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {objection.is_resolved ? <Check className="h-5 w-5 text-white" /> : <AlertCircle className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{objection.employee_name}</h3>
                    <p className="text-sm text-slate-600">{objection.employee_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{objection.salary_month ? `Month ${objection.salary_month}` : 'N/A'} {objection.salary_year}</p>
                    <p className="text-xs text-slate-500">{new Date(objection.objection_date).toLocaleDateString()}</p>
                  </div>
                  {isHR() && <button onClick={(e) => handleDelete(e, objection.id)} disabled={isDeleting === objection.id} className="rounded-lg bg-slate-100 p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" title="Delete permanently">{isDeleting === objection.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}</button>}
                  {expandedId === objection.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </button>
              {expandedId === objection.id && <div className="border-t border-slate-200 p-4 space-y-4">
                <div><label className="text-sm font-medium text-slate-600">Subject</label><p className="mt-1 text-slate-900">{objection.objection_subject}</p></div>
                <div><label className="text-sm font-medium text-slate-600">Message</label><p className="mt-1 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{objection.objection_message}</p></div>
                {objection.is_resolved && <><div><label className="text-sm font-medium text-slate-600">Resolved date</label><p className="mt-1 text-slate-900">{new Date(objection.resolved_date).toLocaleDateString()}</p></div>{objection.resolution_notes && <div><label className="text-sm font-medium text-slate-600">Resolution notes</label><p className="mt-1 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{objection.resolution_notes}</p></div>}</>}
                {isHR() && !objection.is_resolved && <div className="space-y-3 border-t border-slate-200 pt-4"><div><label className="text-sm font-medium text-slate-600">Resolution notes (optional)</label><textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Add notes about how this objection was resolved..." className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" rows="3" /></div><button onClick={() => handleResolve(objection.id)} disabled={resolvingId === objection.id} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"><Check className="h-4 w-4" /><span>{resolvingId === objection.id ? 'Resolving...' : 'Mark as resolved'}</span></button></div>}
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Objections;
