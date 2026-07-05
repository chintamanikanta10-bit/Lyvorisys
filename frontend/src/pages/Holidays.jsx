import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, DownloadCloud, Sparkles } from 'lucide-react';
import { getAuthHeaders, isHR } from '../auth';
import { API_BASE } from '../config';

const Holidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchHolidays = async () => {
        try {
            const res = await fetch(`${API_BASE}/holidays/`, { headers: getAuthHeaders() });
            const data = await res.json();
            setHolidays(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const importHolidays = async () => {
        if (!isHR()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/fetch_holidays/?year=${year}&country=IN`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            alert(data.message);
            fetchHolidays();
        } catch (err) {
            alert(err.message || 'Failed to import holidays');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
                            <Sparkles className="h-4 w-4" />
                            Holiday calendar
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight">Holiday management</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">Review and refresh your public holiday schedule without changing any workflow or data logic.</p>
                    </div>
                </div>
            </div>

            {isHR() && (
                <div className="glass-card p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Import annual holiday list</p>
                            <p className="mt-1 text-sm text-slate-500">Pull national holidays into the system for the selected year.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
                                <input type="number" value={year} onChange={e => setYear(e.target.value)} className="block w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <button onClick={importHolidays} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                                <DownloadCloud className="h-4 w-4" />
                                <span>{loading ? 'Importing...' : 'Auto-import holidays'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                {holidays.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><CalendarIcon className="h-7 w-7" /></div>
                        <p className="text-lg font-semibold text-slate-900">No holidays loaded</p>
                        <p className="mt-2">Import a holiday calendar to populate this list.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Holiday Name</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {holidays.map((h, i) => (
                                    <tr key={i} className="transition hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                            <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-slate-400" />{h.holiday_date}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{h.holiday_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Holidays;
