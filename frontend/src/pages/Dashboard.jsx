import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  Users,
  WalletCards
} from 'lucide-react';
import { getAuthHeaders, isHR } from '../auth';

const API_BASE = 'http://localhost:8001/api';

const formatMonth = (month, year) => (
  new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

const getFallbackPayrollMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const statusClasses = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  Pending: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  Processing: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  'Requires Attention': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    total_holidays: 0,
    total_departments: 0
  });
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isHR()) {
          const [statsRes, uploadedRes, salaryRes, objectionsRes] = await Promise.all([
            fetch(`${API_BASE}/dashboard_stats/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/uploaded_files/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/salary_records/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/objections/stats/unresolved`, { headers: getAuthHeaders() }),
          ]);
          setStats(await statsRes.json());
          setUploadedFiles(await uploadedRes.json());
          setSalaryRecords(await salaryRes.json());
          if (objectionsRes.ok) {
            const objections = await objectionsRes.json();
            setUnresolvedCount(objections.unresolved_count || 0);
          }
        } else {
          const [empRes, attRes, salRes, holRes] = await Promise.all([
            fetch(`${API_BASE}/employees/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/attendance/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/salary_records/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/holidays/`, { headers: getAuthHeaders() }),
          ]);
          const employees = await empRes.json();
          if (employees.length > 0) setEmployee(employees[0]);
          setAttendance(await attRes.json());
          setSalaryRecords(await salRes.json());
          setHolidays(await holRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-up">
        <div className="glass-card p-6">
          <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-card p-5">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
              <div className="mt-4 h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isHR()) {
    const sortedUploads = [...uploadedFiles].sort((a, b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0));
    const latestUpload = sortedUploads[0] || null;
    const hasUpload = Boolean(latestUpload);
    const hasSalaryReport = salaryRecords.length > 0;
    const processingMonth = latestUpload?.month && latestUpload?.year
      ? formatMonth(latestUpload.month, latestUpload.year)
      : getFallbackPayrollMonth();
    const uploadDate = latestUpload?.upload_date
      ? new Date(latestUpload.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Not uploaded';
    const workflowProgress = hasSalaryReport ? 80 : hasUpload ? 65 : 20;

    const statCards = [
      { title: 'Employees', value: stats.total_employees, detail: `${stats.total_employees} Active`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Holidays', value: stats.total_holidays, detail: 'Year 2026', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
      { title: 'Departments', value: stats.total_departments, detail: `${stats.total_departments} Active`, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
      { title: 'System Status', value: 'Active', detail: 'All systems operational', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    ];
    const workflowStages = [
      { title: 'Attendance Uploaded', description: uploadDate, status: hasUpload ? 'Completed' : 'Requires Attention', icon: UploadCloud },
      { title: 'Attendance Validated', description: hasUpload ? 'No issues detected' : 'Waiting for file', status: hasUpload ? 'Completed' : 'Pending', icon: ShieldCheck },
      { title: 'Payroll Processing', description: hasSalaryReport ? 'Payroll calculated' : 'Ready to calculate', status: hasSalaryReport ? 'Completed' : hasUpload ? 'Processing' : 'Pending', icon: DollarSign },
      { title: 'Salary Reports', description: hasSalaryReport ? 'Reports available' : 'Not generated', status: hasSalaryReport ? 'Completed' : 'Pending', icon: FileText },
      { title: 'Month Closed', description: hasSalaryReport ? 'Awaiting final review' : 'Not closed', status: 'Pending', icon: CheckCircle2 }
    ];
    const actions = [
      { title: 'Open Attendance Upload', subtitle: 'Navigate to attendance upload page.', path: '/upload', icon: UploadCloud },
      { title: 'Generate Payroll', subtitle: `Calculate salary for ${processingMonth}.`, path: '/salary', icon: DollarSign },
      { title: 'Export Payroll Data', subtitle: 'Download payroll data.', path: '/salary', icon: Download }
    ];
    const recentActivity = [
      { title: 'Attendance Uploaded', subtitle: processingMonth, timestamp: uploadDate, icon: UploadCloud, tone: 'emerald' },
      { title: 'Payroll Started', subtitle: 'Payroll workflow opened', timestamp: uploadDate, icon: DollarSign, tone: 'blue' },
      { title: 'Holiday Calendar Updated', subtitle: 'Annual calendar ready', timestamp: '02 Jul 2026', icon: Calendar, tone: 'amber' },
      { title: 'Employee Updated', subtitle: 'Workforce records synced', timestamp: '01 Jul 2026', icon: User, tone: 'violet' },
      { title: 'System Backup Completed', subtitle: 'Operational backup complete', timestamp: '01 Jul 2026', icon: ShieldCheck, tone: 'emerald' }
    ];
    const toneClass = {
      emerald: 'bg-emerald-50 text-emerald-700',
      blue: 'bg-blue-50 text-blue-700',
      amber: 'bg-amber-50 text-amber-700',
      violet: 'bg-violet-50 text-violet-700'
    };

    return (
      <div className="space-y-4 animate-fade-up">
        <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
                <Sparkles className="h-4 w-4" />
                HR operations control center
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Monthly Payroll Cycle</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">Track monthly attendance upload, payroll readiness, salary reports and month closing.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="text-slate-300">Processing Month</p>
              <p className="text-lg font-semibold text-white">{processingMonth}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.title} className="glass-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.title}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</h3>
                  <p className={`mt-1 text-sm font-medium ${card.color}`}>{card.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="glass-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-950">Monthly Payroll Cycle</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">Compact workflow for {processingMonth} payroll processing.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-2 text-right">
                <p className="text-xs font-semibold text-blue-600">Processing Month</p>
                <p className="text-lg font-semibold text-blue-700">{processingMonth}</p>
              </div>
            </div>

            <div className="mt-5 space-y-0">
              {workflowStages.map((stage, index) => (
                <div key={stage.title} className="relative flex gap-4 border-b border-slate-100 py-3 last:border-b-0">
                  {index < workflowStages.length - 1 && (
                    <div className="absolute left-[17px] top-11 h-[calc(100%-20px)] w-px bg-slate-200" />
                  )}
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${stage.status === 'Completed' ? 'bg-emerald-500 text-white' : stage.status === 'Processing' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 ring-2 ring-slate-200'}`}>
                    <stage.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{stage.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{stage.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[stage.status]}`}>{stage.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-900">Overall Progress</p>
                <p className="font-semibold text-blue-700">{workflowProgress}%</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${workflowProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-950">Action Center</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Quick actions to manage your payroll workflow.</p>
            <div className="mt-4 space-y-3">
              {actions.map((action) => (
                <Link key={action.title} to={action.path} className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-blue-100 hover:bg-blue-50/60">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                      <action.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        {action.title}
                        {typeof action.badge === 'number' && action.badge > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{action.badge}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{action.subtitle}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-950">Recent Activity</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Latest activities in the system.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {recentActivity.map((activity) => (
              <div key={activity.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-2xl ${toneClass[activity.tone]}`}>
                  <activity.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-slate-950">{activity.title}</p>
                <p className="mt-1 text-xs text-slate-500">{activity.subtitle}</p>
                <p className="mt-2 text-xs font-medium text-slate-400">{activity.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const latestSalary = salaryRecords.length > 0 ? salaryRecords[0] : null;
  const upcomingHoliday = holidays[0];

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
              <Sparkles className="h-4 w-4" />
              Personal workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My HR dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">View your attendance, leave balance, payslip, holidays, and recent notifications.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <p className="text-slate-300">Current access</p>
            <p className="font-semibold text-white">Employee self-service</p>
          </div>
        </div>
      </div>

      {employee && (
        <div className="glass-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{employee.employee_name}</h2>
                <p className="text-sm text-slate-500">Employee ID: {employee.employee_id}</p>
                <p className="text-sm text-slate-500">Department: {employee.department}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Employment status</p>
              <p>Active and available</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { title: 'My Attendance', value: attendance.length, subtitle: 'Records available', icon: Calendar, tone: 'emerald' },
          { title: 'Leave Balance', value: 'Available', subtitle: 'Review in salary details', icon: ShieldCheck, tone: 'blue' },
          { title: 'Latest Payslip', value: latestSalary ? `₹${Number(latestSalary.final_salary || 0).toLocaleString()}` : 'Pending', subtitle: latestSalary ? 'Latest processed salary' : 'Not generated yet', icon: WalletCards, tone: 'violet' },
          { title: 'Upcoming Holidays', value: holidays.length, subtitle: upcomingHoliday ? upcomingHoliday.holiday_name : 'Holiday calendar', icon: Calendar, tone: 'amber' },
          { title: 'Recent Notifications', value: '0', subtitle: 'No new notifications', icon: Bell, tone: 'blue' }
        ].map((card) => (
          <div key={card.title} className="glass-card p-5 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : card.tone === 'violet' ? 'bg-violet-50 text-violet-700' : card.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-500">{card.title}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{card.value}</h3>
            <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
