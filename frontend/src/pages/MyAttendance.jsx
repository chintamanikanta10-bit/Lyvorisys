import React, { useEffect, useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { getAuthHeaders } from '../auth';

const API_BASE = 'http://localhost:8001/api';

const MyAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/attendance/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const normalized = (data || []).map((record) => {
          const statusValue = String(record.status || record.attendance_status || '').trim();
          const attendanceStatus = statusValue.toLowerCase() === 'present' ? 'Present' : 'Absent';

          return {
            ...record,
            attendanceStatus
          };
        });
        setAttendance(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100"><Sparkles className="h-4 w-4" />Attendance overview</div>
            <h1 className="text-3xl font-semibold tracking-tight">My attendance</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Review your attendance history with a cleaner, easier-to-scan interface.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-slate-500">Loading attendance records...</div>
      ) : attendance.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><CalendarClock className="h-7 w-7" /></div>
          <p className="text-lg font-semibold text-slate-900">No attendance records found</p>
          <p className="mt-2">Attendance entries will appear here once they are available.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {attendance.map((record, index) => (
                  <tr key={index} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${record.attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {record.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;
