import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Download, Mail, Sparkles } from 'lucide-react';
import { getAuthHeaders, isHR } from '../auth';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

const API_BASE = 'http://localhost:8001/api';

const SalaryReports = () => {
    const [salaryData, setSalaryData] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState('5');
    const [year, setYear] = useState('2026');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedFile, setSelectedFile] = useState('');
    const [sendEmails, setSendEmails] = useState(false);
    const [filters, setFilters] = useState({ employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '', remainingCasualLeaves: '', compOffBalance: '', deductionStatus: '' });
    const [appliedFilters, setAppliedFilters] = useState({ employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '', remainingCasualLeaves: '', compOffBalance: '', deductionStatus: '' });

    useEffect(() => {
        if (isHR()) {
            fetchUploadedFiles();
            fetchEmployees();
        } else {
            fetchEmployeeSalaryRecords();
        }
    }, []);

    const fetchEmployeeSalaryRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/salary_records/`, { headers: getAuthHeaders() });
            const data = await res.json();
            setSalaryData(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchUploadedFiles = async () => {
        fetch(`${API_BASE}/uploaded_files/`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setUploadedFiles(data);
                if (data.length > 0) setSelectedFile(data[0].filename);
            })
            .catch(err => console.error('Failed to load uploaded files', err));
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE}/employees/`, { headers: getAuthHeaders() });
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error('Failed to load employees', err);
        }
    };

    const onCalculate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/calculate_salary/?month=${month}&year=${year}&send_email=${sendEmails}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to calculate salary');
            const data = await res.json();
            setSalaryData(data);

            const req = await fetch(`${API_BASE}/leave_balances/?month=${month}&year=${year}`, {
                headers: getAuthHeaders()
            });
            if (!req.ok) throw new Error('Failed to fetch leave balances');
            const leaveData = await req.json();
            setLeaveBalances(leaveData);
        } catch (e) {
            alert('Error calculating salary: ' + e.message);
        }
        setLoading(false);
    };

    const onCalculateByFile = async () => {
        if (!selectedFile) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/calculate_salary_file/?filename=${encodeURIComponent(selectedFile)}&send_email=${sendEmails}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Error calculating salary by file');
            }
            const { month: fileMonth, year: fileYear, results } = await res.json();
            setMonth(String(fileMonth));
            setYear(String(fileYear));
            setSalaryData(results);

            const req = await fetch(`${API_BASE}/leave_balances/?month=${fileMonth}&year=${fileYear}`, {
                headers: getAuthHeaders()
            });
            if (!req.ok) throw new Error('Failed to fetch leave balances');
            const leaveData = await req.json();
            setLeaveBalances(leaveData);
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    const departmentOptions = Array.from(new Set(employees.map((emp) => emp.department).filter(Boolean))).map((department) => ({ label: department, value: department }));
    const attendanceStatusOptions = ['Present', 'Leave', 'LOP', 'Absent'];
    const deductionStatusOptions = ['Deducted', 'No Deduction'];

    const normalizedSalaryRows = useMemo(() => {
        const employeeLookup = Object.fromEntries(employees.map((emp) => [String(emp.employee_id), emp]));
        const leaveLookup = Object.fromEntries(
            leaveBalances.map((lb) => [`${lb.employee_id ?? ''}-${lb.month ?? ''}-${lb.year ?? ''}`, lb])
        );

        return salaryData.map((row) => {
            const employee = employeeLookup[String(row.employee_id)] || {};
            const leaveSnapshot = leaveLookup[`${row.employee_id}-${row.month}-${row.year}`] || {};
            const presentDays = Number(row.present_days || 0);
            const leaveDays = Number(row.leave_days || 0);
            const lopDays = Number(row.lop_days || 0);
            const deduction = Number(row.salary_deduction ?? row.deduction ?? 0);
            let attendanceStatus = 'Absent';
            if (lopDays > 0) attendanceStatus = 'LOP';
            else if (leaveDays > 0) attendanceStatus = 'Leave';
            else if (presentDays > 0) attendanceStatus = 'Present';

            return {
                ...row,
                department: employee.department || '',
                attendanceStatus,
                deductionStatus: deduction > 0 ? 'Deducted' : 'No Deduction',
                remaining_cl: Number(row.remaining_cl ?? leaveSnapshot.remaining_cl ?? 0),
                remaining_comp_off: Number(row.remaining_comp_off ?? leaveSnapshot.remaining_comp_off ?? 0),
                salary_deduction: deduction,
                final_salary: Number(row.final_salary ?? 0)
            };
        });
    }, [salaryData, employees, leaveBalances]);

    const filteredSalaryRows = useMemo(() => {
        return normalizedSalaryRows.filter((row) => {
            const name = String(row.employee_name || '').toLowerCase();
            const id = String(row.employee_id || '').toLowerCase();
            const department = String(row.department || '').toLowerCase();
            const salary = Number(row.final_salary || 0);
            const remainingCl = Number(row.remaining_cl || 0);
            const compOffBalance = Number(row.remaining_comp_off || 0);
            if (appliedFilters.employeeName && !name.includes(appliedFilters.employeeName.toLowerCase())) return false;
            if (appliedFilters.employeeId && !id.includes(appliedFilters.employeeId.toLowerCase())) return false;
            if (appliedFilters.department && !department.includes(appliedFilters.department.toLowerCase())) return false;
            if (appliedFilters.minSalary && salary < Number(appliedFilters.minSalary)) return false;
            if (appliedFilters.maxSalary && salary > Number(appliedFilters.maxSalary)) return false;
            if (appliedFilters.remainingCasualLeaves && remainingCl < Number(appliedFilters.remainingCasualLeaves)) return false;
            if (appliedFilters.compOffBalance && compOffBalance < Number(appliedFilters.compOffBalance)) return false;
            if (appliedFilters.deductionStatus && row.deductionStatus !== appliedFilters.deductionStatus) return false;
            return true;
        });
    }, [normalizedSalaryRows, appliedFilters]);

    const handleApplyFilters = () => setAppliedFilters({ ...filters });
    const handleResetFilters = () => {
        const cleared = { employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '', remainingCasualLeaves: '', compOffBalance: '', deductionStatus: '' };
        setFilters(cleared);
        setAppliedFilters(cleared);
    };

    const handleExportCSV = () => {
        if (!filteredSalaryRows || filteredSalaryRows.length === 0) {
            alert('No salary data to export.');
            return;
        }
        const headers = ['Employee ID', 'Employee Name', 'Present Days', 'Leave Days', 'Previous CL Balance', 'Current CL', 'Total Available CL', 'Used CL', 'Remaining CL', 'Previous Comp-Off', 'Earned Comp-Off', 'Available Comp-Off', 'Used Comp-Off', 'Remaining Comp-Off', 'LOP Days', 'Salary Deduction', 'Final Salary'];
        const rows = filteredSalaryRows.map(r => [r.employee_id, r.employee_name, r.present_days, r.leave_days, r.previous_cl ?? 0, r.current_cl ?? 0, r.total_available_cl ?? 0, r.used_cl ?? 0, r.remaining_cl ?? 0, r.previous_comp_off ?? 0, r.monthly_comp_off_earned ?? 0, r.total_available_comp_off ?? 0, r.used_comp_off ?? 0, r.remaining_comp_off ?? 0, r.lop_days ?? 0, r.salary_deduction != null ? Number(r.salary_deduction).toFixed(2) : 0, r.final_salary != null ? Number(r.final_salary).toFixed(2) : 0]);
        const csvContent = [headers, ...rows].map(e => e.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary_${month}_${year}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (isHR()) {
        return (
            <div className="space-y-6 animate-fade-up">
                <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100"><Sparkles className="h-4 w-4" />Payroll control center</div>
                            <h1 className="text-3xl font-semibold tracking-tight">Salary & leave reports</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">Process payroll and review salary details with a more polished and professional workflow.</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 space-y-6">
                    <label htmlFor="sendEmails" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        <input id="sendEmails" type="checkbox" checked={sendEmails} onChange={e => setSendEmails(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <Mail className="h-4 w-4" />
                        <span>Send salary slips via email to employees</span>
                    </label>

                    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <h2 className="text-lg font-semibold text-slate-800">Calculate from uploaded Excel</h2>
                            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
                                <div className="flex-1">
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Select Excel file</label>
                                    <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                        {uploadedFiles.map(f => {
                                            const monthNames = { 1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December' };
                                            const monthStr = monthNames[f.month] || f.month;
                                            return <option key={f.filename} value={f.filename}>{f.filename} ({monthStr} {f.year})</option>;
                                        })}
                                    </select>
                                </div>
                                <button onClick={onCalculateByFile} disabled={loading || !selectedFile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                                    <Calculator className="h-4 w-4" />
                                    <span>{loading ? 'Processing...' : 'Calculate via Excel'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <h2 className="text-lg font-semibold text-slate-800">Calculate manually</h2>
                            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Month</label>
                                    <select value={month} onChange={e => setMonth(e.target.value)} className="mt-1 block w-36 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                                        <option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option><option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8">August</option><option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
                                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className="mt-1 block w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                </div>
                                <button onClick={onCalculate} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                                    <Calculator className="h-4 w-4" />
                                    <span>{loading ? 'Processing...' : 'Run processing'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <AdvancedFilterPanel
                    title="Payroll intelligence filters"
                    description="Combine employee, attendance, leave, and deduction criteria to focus the salary report instantly."
                    fields={[
                        { key: 'employeeName', label: 'Employee Name', placeholder: 'Search by name' },
                        { key: 'employeeId', label: 'Employee ID', placeholder: 'Search by ID' },
                        { key: 'department', label: 'Department', type: 'select', placeholder: 'All departments', options: departmentOptions },
                        { key: 'minSalary', label: 'Minimum Salary', type: 'number', min: 0, placeholder: 'Min' },
                        { key: 'maxSalary', label: 'Maximum Salary', type: 'number', min: 0, placeholder: 'Max' },
                        { key: 'remainingCasualLeaves', label: 'Remaining Casual Leaves', type: 'number', min: 0, placeholder: 'Min leaves' },
                        { key: 'compOffBalance', label: 'Comp-Off Balance', type: 'number', min: 0, placeholder: 'Min balance' },
                        { key: 'deductionStatus', label: 'Salary Deduction Status', type: 'select', placeholder: 'Any status', options: deductionStatusOptions.map((option) => ({ label: option, value: option })) }
                    ]}
                    filters={filters}
                    onFilterChange={setFilters}
                    onApply={handleApplyFilters}
                    onReset={handleResetFilters}
                    departmentOptions={departmentOptions}
                />

                {filteredSalaryRows.length > 0 ? (
                    <div className="glass-card overflow-hidden">
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">Salary summary ({month}/{year})</h2>
                            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800">
                                <Download className="h-4 w-4" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employee ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employee Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Present Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Leave Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Previous CL Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current CL</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Total Available CL</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Used CL</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Remaining CL</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Previous Comp-Off</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Earned Comp-Off</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Available Comp-Off</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Used Comp-Off</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Remaining Comp-Off</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">LOP Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Salary Deduction</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Final Salary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredSalaryRows.map((row, i) => (
                                        <tr key={i} className="transition hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{row.employee_id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{row.employee_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{row.present_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.leave_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.previous_cl || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.current_cl || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.total_available_cl || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.used_cl || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{row.remaining_cl || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.previous_comp_off || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.monthly_comp_off_earned || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.total_available_comp_off || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.used_comp_off || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{row.remaining_comp_off || 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">{row.lop_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">₹{Number(row.salary_deduction ?? 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">₹{Number(row.final_salary ?? 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center text-slate-500">
                        <p className="text-lg font-semibold text-slate-900">No salary data available</p>
                        <p className="mt-2">Run a payroll calculation to populate the summary table.</p>
                    </div>
                )}
            </div>
        );
    } else {
        return (
            <div className="space-y-6 animate-fade-up">
                <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100"><Sparkles className="h-4 w-4" />Personal payroll details</div>
                            <h1 className="text-3xl font-semibold tracking-tight">My salary records</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">Keep track of your salary summary and leave impact without leaving the portal.</p>
                        </div>
                    </div>
                </div>
                {loading && <div className="glass-card p-6 text-slate-500">Loading salary records...</div>}
                {!loading && salaryData.length === 0 && <div className="glass-card p-12 text-center text-slate-500"><p className="text-lg font-semibold text-slate-900">No salary records found</p><p className="mt-2">Your salary slips will appear here once they are generated.</p></div>}
                {!loading && salaryData.length > 0 && (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Month</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Year</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Present Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Leave Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">LOP Days</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Salary Deduction</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Final Salary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {salaryData.map((row, i) => (
                                        <tr key={i} className="transition hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{row.month}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{row.year}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{row.present_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.leave_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">{row.lop_days}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">₹{row.salary_deduction?.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">₹{row.final_salary?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};

export default SalaryReports;
