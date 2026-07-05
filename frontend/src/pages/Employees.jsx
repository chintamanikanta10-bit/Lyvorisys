import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, X, Trash2, Edit2, Users as UsersIcon, Briefcase } from 'lucide-react';
import { getAuthHeaders, isHR } from '../auth';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';
import { API_BASE } from '../config';

const Employees = () => {
    const [emps, setEmps] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [form, setForm] = useState({ employee_id: '', employee_name: '', department: 'General', salary: 30000, email: '' });
    const [editForm, setEditForm] = useState({});
    const [filters, setFilters] = useState({ employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '' });
    const [appliedFilters, setAppliedFilters] = useState({ employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '' });

    const fetchEmps = async () => {
        try {
            const res = await fetch(`${API_BASE}/employees/`, { headers: getAuthHeaders() });
            const data = await res.json();
            setEmps(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEmps();
    }, []);

    if (!isHR()) {
        return (
            <div className="glass-card p-8 text-center text-slate-600">
                <p className="text-lg font-semibold text-slate-900">Access restricted</p>
                <p className="mt-2">Only HR users can manage employee records.</p>
            </div>
        );
    }

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/employees/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(form)
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.detail || 'Failed to add employee');
                return;
            }
            setShowModal(false);
            setForm({ employee_id: '', employee_name: '', department: 'General', salary: 30000, email: '' });
            fetchEmps();
        } catch (err) {
            alert(err.message || 'Failed to add employee');
        }
    };

    const handleEdit = (emp) => {
        setEditingEmp(emp);
        setEditForm({ ...emp });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/employees/${editingEmp.employee_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.detail || 'Failed to update employee');
                return;
            }
            setShowEditModal(false);
            setEditingEmp(null);
            fetchEmps();
        } catch (err) {
            alert(err.message || 'Failed to update employee');
        }
    };

    const handleDelete = async (emp) => {
        if (window.confirm('Are you sure you want to remove this employee? This will also delete their attendance and salary records.')) {
            try {
                const res = await fetch(`${API_BASE}/employees/${emp.employee_id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.detail || 'Failed to delete employee');
                    return;
                }
                fetchEmps();
            } catch (err) {
                alert('Failed to delete employee: ' + err.message);
            }
        }
    };

    const departmentCount = new Set(emps.map((emp) => emp.department)).size;
    const departmentOptions = Array.from(new Set(emps.map((emp) => emp.department).filter(Boolean))).map((department) => ({ label: department, value: department }));
    const filteredEmps = useMemo(() => {
        return emps.filter((emp) => {
            const name = String(emp.employee_name || '').toLowerCase();
            const id = String(emp.employee_id || '').toLowerCase();
            const department = String(emp.department || '').toLowerCase();
            const salary = Number(emp.salary || 0);

            if (appliedFilters.employeeName && !name.includes(appliedFilters.employeeName.toLowerCase())) return false;
            if (appliedFilters.employeeId && !id.includes(appliedFilters.employeeId.toLowerCase())) return false;
            if (appliedFilters.department && !department.includes(appliedFilters.department.toLowerCase())) return false;
            if (appliedFilters.minSalary && salary < Number(appliedFilters.minSalary)) return false;
            if (appliedFilters.maxSalary && salary > Number(appliedFilters.maxSalary)) return false;
            return true;
        });
    }, [emps, appliedFilters]);

    const handleApplyFilters = () => setAppliedFilters({ ...filters });
    const handleResetFilters = () => {
        const cleared = { employeeName: '', employeeId: '', department: '', minSalary: '', maxSalary: '' };
        setFilters(cleared);
        setAppliedFilters(cleared);
    };

    return (
        <div className="space-y-6 relative animate-fade-up">
            <div className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">Employee directory</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Manage workforce records</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">Add, update, and maintain employee profiles with a streamlined HR experience.</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100">
                        <PlusCircle className="h-5 w-5" />
                        <span>Add Employee</span>
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><UsersIcon className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Registered employees</p>
                            <h3 className="text-2xl font-semibold text-slate-900">{emps.length}</h3>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><Briefcase className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Departments</p>
                            <h3 className="text-2xl font-semibold text-slate-900">{departmentCount}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <form onSubmit={handleAdd} className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl relative">
                        <button type="button" onClick={() => setShowModal(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-semibold text-slate-900">Add new employee</h2>
                        <p className="mt-1 text-sm text-slate-500">Create a new profile and configure their core details.</p>
                        <div className="mt-5 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700">Employee ID</label><input required type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Name</label><input required type="text" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Email (Optional)</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Department</label><input required type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Salary</label><input required type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <button type="submit" className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">Save employee</button>
                        </div>
                    </form>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <form onSubmit={handleUpdate} className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl relative">
                        <button type="button" onClick={() => setShowEditModal(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-semibold text-slate-900">Edit employee</h2>
                        <p className="mt-1 text-sm text-slate-500">Update profile information without changing the employee record workflow.</p>
                        <div className="mt-5 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700">Employee ID</label><input disabled type="text" value={editForm.employee_id || ''} onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Name</label><input type="text" value={editForm.employee_name || ''} onChange={e => setEditForm({ ...editForm, employee_name: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Email (Optional)</label><input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Department</label><input type="text" value={editForm.department || ''} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Salary</label><input type="number" value={editForm.salary || ''} onChange={e => setEditForm({ ...editForm, salary: e.target.value })} className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
                            <button type="submit" className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">Update employee</button>
                        </div>
                    </form>
                </div>
            )}

            <AdvancedFilterPanel
                title="Employee intelligence filters"
                description="Combine name, ID, department, and salary criteria to quickly narrow the workforce list."
                fields={[
                    { key: 'employeeName', label: 'Employee Name', placeholder: 'Search by name' },
                    { key: 'employeeId', label: 'Employee ID', placeholder: 'Search by ID' },
                    { key: 'department', label: 'Department', type: 'select', placeholder: 'All departments', options: departmentOptions },
                    { key: 'minSalary', label: 'Minimum Salary', type: 'number', min: 0, placeholder: 'Min' },
                    { key: 'maxSalary', label: 'Maximum Salary', type: 'number', min: 0, placeholder: 'Max' }
                ]}
                filters={filters}
                onFilterChange={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                departmentOptions={departmentOptions}
            />

            <div className="glass-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Employee list</h2>
                        <p className="text-sm text-slate-500">Showing {filteredEmps.length} of {emps.length} employees</p>
                    </div>
                </div>
                {filteredEmps.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><UsersIcon className="h-7 w-7" /></div>
                        <p className="text-lg font-semibold text-slate-900">No employees matched the current criteria</p>
                        <p className="mt-2">Adjust the filters or add a new employee to begin managing records.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Salary</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {filteredEmps.map((emp, i) => (
                                    <tr key={i} className="transition hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{emp.employee_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{emp.employee_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.email || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">₹{emp.salary}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button onClick={() => handleEdit(emp)} className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50" title="Edit employee"><Edit2 className="h-5 w-5" /></button>
                                            <button onClick={() => handleDelete(emp)} className="ml-2 rounded-full p-2 text-red-600 transition hover:bg-red-50" title="Delete employee"><Trash2 className="h-5 w-5" /></button>
                                        </td>
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
export default Employees;
