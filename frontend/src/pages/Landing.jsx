import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock3, CreditCard, Users, Mail, FileText, ArrowRight } from 'lucide-react';

const features = [
  { title: 'Attendance Tracking', icon: Clock3, description: 'Monitor staff attendance with fast upload and reporting.' },
  { title: 'Salary Automation', icon: CreditCard, description: 'Compute salaries automatically from hours and attendance.' },
  { title: 'Employee Management', icon: Users, description: 'Manage employee records from one secure dashboard.' },
  { title: 'Salary Slip Emails', icon: Mail, description: 'Send salary slips by email with one click.' },
  { title: 'Excel/CSV Export', icon: FileText, description: 'Export attendance and payroll data instantly.' },
  { title: 'Leave Management', icon: ShieldCheck, description: 'Track leave requests and approvals effortlessly.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col-reverse md:flex-row items-center justify-between gap-4">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            LYVORISYS
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all">
              Login
            </Link>
            <Link to="/signup" className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <section className="text-center space-y-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
            Built for modern attendance and payroll teams
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              LYVORISYS
            </h1>
            <p className="mx-auto max-w-3xl text-slate-600 text-lg sm:text-xl leading-8">
              Transform Attendance Into Seamless Salaries with a polished dashboard, employee automation, and fast payroll workflows.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all w-full sm:w-auto">
              Login
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link to="/signup" className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-100 transition-all w-full sm:w-auto">
              Sign Up
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-2 mt-12">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 hover:shadow-md transition-shadow text-left">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-3xl bg-blue-50 text-blue-600 mb-5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 leading-7">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-slate-900 px-8 py-14 text-center text-white shadow-xl shadow-slate-900/10">
          <h2 className="text-3xl font-bold">Ready to simplify attendance and payroll?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300 text-base sm:text-lg leading-7">
            Start managing attendance, salaries, and employee records in one polished portal built for clarity and speed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/signup" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-white font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all w-full sm:w-auto">
              Get Started
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/90 px-8 py-3 text-slate-100 hover:bg-slate-800 transition-all w-full sm:w-auto">
              Login
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-6 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <div className="text-xl font-bold text-slate-900">
              LYVORISYS
            </div>
            <p className="mt-3 text-slate-600 max-w-lg">
              A unified attendance and salary management experience with modern cards, clean spacing, and responsive layouts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 text-sm text-slate-500">
            <span>© 2026 LYVORISYS</span>
            <Link to="/login" className="hover:text-slate-900 transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-slate-900 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
