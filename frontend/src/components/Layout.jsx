import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, DollarSign, UploadCloud, AlertCircle, Menu, PanelLeftClose, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { getCurrentUser, logoutUser, isAuthenticated, isHR, validateCurrentUser } from '../auth';
import NotificationBell from './NotificationBell';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 16) return 'Good afternoon';
  if (hour >= 16 && hour < 21) return 'Good evening';
  return 'Good night';
};

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const cachedUser = getCurrentUser();
      if (!isAuthenticated() || !cachedUser) {
        logoutUser();
        navigate('/login', { replace: true });
        return;
      }

      let verifiedUser = null;
      try {
        verifiedUser = await validateCurrentUser();
      } catch {
        logoutUser();
      }

      if (!isMounted) return;

      if (!verifiedUser) {
        navigate('/login', { replace: true });
        return;
      }

      setCurrentUser(verifiedUser);
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = currentUser ? (
    isHR(currentUser) ? [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Employees', path: '/employees', icon: Users },
      { name: 'Attendance Upload', path: '/upload', icon: UploadCloud },
      { name: 'Holidays', path: '/holidays', icon: Calendar },
      { name: 'Salary Reports', path: '/salary', icon: DollarSign },
      { name: 'Objections', path: '/objections', icon: AlertCircle },
    ] : [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'My Attendance', path: '/attendance', icon: Calendar },
      { name: 'My Salary', path: '/salary', icon: DollarSign },
      { name: 'Holidays', path: '/holidays', icon: Calendar },
    ]
  ) : [];

  if (!currentUser) {
    return null;
  }

  const userName = currentUser.username || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const greeting = getGreeting();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/70 bg-slate-950 text-white shadow-2xl transition-all duration-300 lg:static ${sidebarCollapsed ? 'w-20' : 'w-72'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-5">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/90 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-lg font-semibold tracking-tight">LYVORISYS</p>
                <p className="text-xs text-slate-400">HRMS Workspace</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className={`mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 ${sidebarCollapsed ? 'hidden' : 'block'}`}>Navigation</p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {mobileMenuOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">{greeting}</p>
                <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${currentUser.role === 'hr' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {currentUser.role.toUpperCase()}
              </div>
              {isHR(currentUser) && <NotificationBell />}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-2 transition hover:border-blue-200 hover:bg-white"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {userInitial}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-semibold text-slate-800">{userName}</div>
                    <div className="text-xs text-slate-500">{currentUser.role === 'hr' ? 'HR Manager' : 'Employee'}</div>
                  </div>
                  <ChevronDown className="mr-1 h-4 w-4 text-slate-500" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
