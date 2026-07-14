import React, { useState } from 'react';
import api from '../api';
import { Sparkles, Shield, User, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [department, setDepartment] = useState('ROADS_DEPARTMENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register API Call
        await api.post('/auth/register', {
          username,
          email,
          password,
          role,
          department: role === 'officer' || role === 'dept_head' ? department : null,
        });
        
        // Auto-login after successful registration
        const response = await api.post('/auth/login', { username, password });
        onLoginSuccess(response.data);
      } else {
        // Login API Call
        const response = await api.post('/auth/login', { username, password });
        onLoginSuccess(response.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Authentication failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: user,
        password: pass
      });
      onLoginSuccess(response.data);
    } catch (err) {
      setError('Quick login failed. Ensure the backend is running and database is seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>

      <div className="max-w-md w-full space-y-8 z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white font-outfit tracking-tight">
            Grievix <span className="text-blue-500">AI</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            AI-Powered Smart Public Grievance Management System
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-2xl shadow-2xl relative">
          <div className="flex border-b border-slate-800 mb-6 pb-1">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-all ${!isRegister ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-450 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-all ${isRegister ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-450 hover:text-slate-200'}`}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                  placeholder="Enter username"
                />
              </div>
            </div>

            {/* Email Input (Register only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* Role & Department Selection (Register only) */}
            {isRegister && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Register As</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-sm appearance-none bg-slate-900"
                  >
                    <option value="citizen">Citizen (General Public)</option>
                    <option value="officer">Department Officer</option>
                    <option value="dept_head">Department Head</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                {(role === 'officer' || role === 'dept_head') && (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Department Assigned</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="glass-input w-full px-3 py-2.5 rounded-lg text-sm appearance-none bg-slate-900"
                    >
                      <option value="ROADS_DEPARTMENT">Roads Department</option>
                      <option value="WATER_DEPARTMENT">Water Department</option>
                      <option value="ELECTRICITY_BOARD">Electricity Board</option>
                      <option value="MUNICIPALITY">Municipality</option>
                      <option value="TRAFFIC_POLICE">Traffic Police</option>
                      <option value="PUBLIC_HEALTH">Public Health</option>
                      <option value="FOREST_DEPARTMENT">Forest Department</option>
                      <option value="POLICE">Police</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isRegister ? 'Register & Log In' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts Panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
              Quick Developer Logins
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('citizen', 'password')}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
            >
              <span>Citizen</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
            <button
              onClick={() => handleQuickLogin('roads_officer', 'password')}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
            >
              <span>Roads Officer</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
            <button
              onClick={() => handleQuickLogin('water_officer', 'password')}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
            >
              <span>Water Officer</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
            <button
              onClick={() => handleQuickLogin('dept_head', 'password')}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
            >
              <span>Roads Dept Head</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
            <button
              onClick={() => handleQuickLogin('admin', 'password')}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 col-span-2 text-center text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-2"
            >
              <span>Administrator Portal</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
