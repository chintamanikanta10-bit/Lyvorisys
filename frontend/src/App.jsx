import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Holidays from './pages/Holidays'
import SalaryReports from './pages/SalaryReports'
import UploadAttendance from './pages/UploadAttendance'
import Objections from './pages/Objections'
import MyAttendance from './pages/MyAttendance'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { getCurrentUser, isAuthenticated } from './auth'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes sharing a single Layout instance */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/salary" element={<SalaryReports />} />
          <Route path="/upload" element={<UploadAttendance />} />
          <Route path="/objections" element={<Objections />} />
          <Route path="/attendance" element={<MyAttendance />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
export default App
