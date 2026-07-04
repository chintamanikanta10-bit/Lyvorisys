import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../auth';

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'hr', employeeId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    const value = form.password;
    if (value.length >= 10 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) {
      return { label: 'Strong', color: 'bg-emerald-500', width: 'w-3/4' };
    }
    if (value.length >= 8) {
      return { label: 'Medium', color: 'bg-amber-400', width: 'w-1/2' };
    }
    if (value.length > 0) {
      return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    }
    return { label: 'Empty', color: 'bg-slate-200', width: 'w-0' };
  }, [form.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!form.username.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError('Password should be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (form.role === 'employee' && !form.employeeId.trim()) {
      setError('Employee ID is required for Employee role.');
      setLoading(false);
      return;
    }

    try {
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        employeeId: form.role === 'employee' ? Number(form.employeeId) : null,
      });
      setSuccess('Account created successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1400);
    } catch (err) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-blue-600 font-semibold">Start your onboarding</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-2 text-slate-600">Securely sign up and manage attendance, payroll, and reports from one place.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="hr"
                    checked={form.role === 'hr'}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-slate-700">HR</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="employee"
                    checked={form.role === 'employee'}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-slate-700">Employee</span>
                </label>
              </div>
            </div>
            {form.role === 'employee' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee ID (Database ID)</label>
                <input
                  type="number"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  placeholder="Enter employee ID"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
              />
              <div className="mt-3 rounded-2xl bg-slate-100 overflow-hidden">
                <div className={`h-2 ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`} />
              </div>
              <p className="mt-2 text-sm text-slate-500">Strength: {passwordStrength.label}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
              />
            </div>

            {error && <div className="rounded-2xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">{success}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
