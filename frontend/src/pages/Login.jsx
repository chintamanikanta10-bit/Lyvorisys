import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { getCurrentUser, loginUser } from '../auth';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      await loginUser(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-blue-600 font-semibold">LYVORISYS</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-slate-600">Login to continue to your attendance and payroll dashboard.</p>
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
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-sm text-slate-500 hover:text-slate-900 transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="mt-2 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-200 focus:outline-none focus:ring-2 transition"
                />
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </div>
              </div>
            </div>

            {error && <div className="rounded-2xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
