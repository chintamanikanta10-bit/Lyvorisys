import React, { useState, useEffect, useMemo } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Trash2, Eye, Sparkles } from 'lucide-react';
import { getAuthHeaders, isHR, parseApiError } from '../auth';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

const API_BASE = 'http://localhost:8001/api';

const UploadAttendance = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filters, setFilters] = useState({ fileName: '', uploadDate: '' });
  const [appliedFilters, setAppliedFilters] = useState({ fileName: '', uploadDate: '' });

  useEffect(() => {
    if (isHR()) {
      fetchAttendance();
      fetchUploadedFiles();
    }
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/uploaded_files/`, { headers: getAuthHeaders() });
      const data = await res.json();
      setUploadedFiles(data);
    } catch (e) {
      console.error('Failed to load uploaded files');
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/`, { headers: getAuthHeaders() });
      const data = await res.json();
      setAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance');
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this uploaded attendance file? This will remove all related attendance and salary records.')) return;
    try {
      await fetch(`${API_BASE}/uploaded_files/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchUploadedFiles();
      fetchAttendance();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleFile = (e) => setFiles(Array.from(e.target.files));

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setMsg('');
    setError('');
    const form = new FormData();
    files.forEach(f => {
      form.append('files', f);
    });

    try {
      const res = await fetch(`${API_BASE}/upload_attendance/`, {
        method: 'POST',
        headers: getAuthHeaders({ json: false }),
        body: form
      });
      if (!res.ok) {
        let errMsg = 'Upload failed';
        try {
          const errData = await res.json();
          errMsg = parseApiError(errData, errMsg);
        } catch (jsonErr) {
          errMsg = `Upload failed with status: ${res.status}`;
        }
        throw new Error(errMsg);
      }
      const result = await res.json();
      setMsg(result.message);
      fetchAttendance();
      fetchUploadedFiles();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    }
    setLoading(false);
  };

  const normalizedAttendanceRows = useMemo(() => {
    return attendance.map((row) => {
      const rowStatus = String(row.status || row.attendance_status || row.state || row.record_status || '').trim().toLowerCase();
      let derivedStatus = 'Absent';
      if (rowStatus === 'present') derivedStatus = 'Present';
      else if (rowStatus === 'leave') derivedStatus = 'Leave';
      else if (rowStatus === 'comp-off' || rowStatus === 'comp off' || rowStatus === 'comp_off') derivedStatus = 'Comp-Off';
      else if (rowStatus === 'lop') derivedStatus = 'LOP';
      else if (row.in_time && row.in_time !== 'NULL' && row.out_time && row.out_time !== 'NULL') derivedStatus = 'Present';

      const attendanceDate = row.date ? new Date(row.date) : null;
      return {
        ...row,
        derivedStatus,
        month: attendanceDate ? attendanceDate.getMonth() + 1 : null,
        year: attendanceDate ? attendanceDate.getFullYear() : null
      };
    });
  }, [attendance]);

  const filteredAttendanceRows = useMemo(() => normalizedAttendanceRows, [normalizedAttendanceRows]);

  const filteredUploadedFiles = useMemo(() => {
    return uploadedFiles.filter((file) => {
      const fileName = String(file.filename || '').toLowerCase();
      const uploadDate = file.upload_date ? String(file.upload_date).slice(0, 10) : '';

      if (appliedFilters.fileName && !fileName.includes(appliedFilters.fileName.toLowerCase())) return false;
      if (appliedFilters.uploadDate && uploadDate !== appliedFilters.uploadDate) return false;
      return true;
    });
  }, [uploadedFiles, appliedFilters]);

  const handleApplyFilters = () => setAppliedFilters({ ...filters });
  const handleResetFilters = () => {
    const cleared = { fileName: '', uploadDate: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  if (!isHR()) {
    return <div className="glass-card p-8 text-center text-slate-600"><p className="text-lg font-semibold text-slate-900">Access restricted</p><p className="mt-2">Only HR users can upload attendance data.</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100"><Sparkles className="h-4 w-4" />Attendance intake</div>
            <h1 className="text-3xl font-semibold tracking-tight">Upload monthly attendance</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Import new attendance reports with a clear, professional flow while preserving the same backend processing.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <UploadCloud className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800">Select Excel file</h3>
        <p className="mt-2 text-sm text-slate-500">Upload your monthly biometric extraction (.xlsx)</p>

        <input type="file" accept=".xlsx, .xls" multiple onChange={handleFile} className="mx-auto mt-6 block w-full max-w-md text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />

        <button onClick={handleUpload} disabled={files.length === 0 || loading} className="mt-6 w-full max-w-md rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? 'Processing...' : 'Upload data'}
        </button>

        {files.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
            <p className="mb-2 font-semibold text-slate-800">Selected files ({files.length})</p>
            <ul className="list-disc space-y-1 pl-5">{files.map((f, idx) => <li key={idx} className="truncate">{f.name}</li>)}</ul>
          </div>
        )}

        {msg && <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><CheckCircle className="h-5 w-5" /><span>{msg}</span></div>}
        {error && <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><AlertCircle className="h-5 w-5" /><span>{error}</span></div>}
      </div>

      <AdvancedFilterPanel
        title="Upload file filters"
        description="Search uploaded attendance files quickly by file name or upload date."
        fields={[
          { key: 'fileName', label: 'File Name', placeholder: 'Search by filename' },
          { key: 'uploadDate', label: 'Upload Date', type: 'date' }
        ]}
        filters={filters}
        onFilterChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-800">Processing instructions</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li><strong>Important:</strong> Only the new attendance Excel format is supported.</li>
          <li>The file must include <strong>Employee ID</strong> and <strong>Employee Name</strong> columns.</li>
          <li>Each date should be its own column.</li>
          <li>Cell values should be one of: <strong>Present, Absent, Leave, Holiday, Sunday, Half Day</strong>.</li>
        </ul>
      </div>

      {filteredUploadedFiles.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Previously uploaded files</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Month/Year</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Total Emp</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Uploaded At</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredUploadedFiles.map((file, i) => (
                  <tr key={file.id || i} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{file.filename}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{file.month}/{file.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{file.total_employees}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{file.upload_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <a href={`${API_BASE}/download_file/${file.id}`} target="_blank" rel="noreferrer" className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50" title="View/download"><Eye className="h-5 w-5" /></a>
                      <button onClick={() => handleDeleteFile(file.id)} className="ml-2 rounded-full p-2 text-red-600 transition hover:bg-red-50" title="Delete"><Trash2 className="h-5 w-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredAttendanceRows.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent attendance records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">In Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredAttendanceRows.map((row, i) => (
                  <tr key={i} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{row.employee_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{row.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.in_time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.out_time}</td>
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

export default UploadAttendance;
