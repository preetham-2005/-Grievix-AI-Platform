import React, { useState } from 'react';
import api from '../api';
import { Sparkles, Shield, User, Mail, Lock, LogIn, ArrowRight, MapPin, Clock, Cpu, Users } from 'lucide-react';

export default function Login({ onLoginSuccess, showToast }) {
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
        
        showToast('Registration successful! Logging you in automatically...', 'success');
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
      const errMsg = err.response?.data?.message || 'Authentication failed. Please check details.';
      setError(errMsg);
      showToast(errMsg, 'error');
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
      showToast('Quick login failed. Verify backend service is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Ambient background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 py-6">
        {/* LEFT SIDE: Platform Glimpse Showcase */}
        <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-6">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-900/30 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Gemini AI Integrated</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-outfit text-white leading-tight">
              Grievix <span className="text-blue-500 bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-xl font-sans">
              An enterprise-grade, smart public grievance management platform transforming municipal operations through artificial intelligence, Leaflet mapping coordinates, and automated SLA escalations.
            </p>
          </div>

          {/* Grid of Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Gemini Categorization</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Automatically reads citizen descriptions in natural language, classifies categories, and predicts priority urgency.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Leaflet OpenStreetMap</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Plot coordinates dynamically. Includes draggable markers for citizens and interactive operations grids for city officials.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">SLA Escalar Engine</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Background scheduled check engines audit case resolution deadlines and auto-elevate priorities on breach.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Workload Balancing</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Intelligently routes new complaints to the department officer with the absolute lowest active queue size.
              </p>
            </div>
          </div>

          {/* Role-Based Overview Grid */}
          <div className="space-y-3.5 border-t border-slate-900 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Control Rooms Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-semibold">
              <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-900 text-slate-300">
                <div className="text-blue-400 font-bold mb-0.5">Citizen</div>
                <div className="text-slate-500 font-medium">GPS Filing & Timeline</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-900 text-slate-300">
                <div className="text-emerald-400 font-bold mb-0.5">Officer</div>
                <div className="text-slate-500 font-medium">Workloads & Proofs</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-900 text-slate-300">
                <div className="text-amber-400 font-bold mb-0.5">Dept Head</div>
                <div className="text-slate-500 font-medium">Local Analytics</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-900 text-slate-300">
                <div className="text-rose-500 font-bold mb-0.5">Admin</div>
                <div className="text-slate-500 font-medium">Global Heatmaps</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Dynamic Login Form & Quick Access */}
        <div className="lg:col-span-5 space-y-6">
          {/* Form Container */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl relative border border-slate-900 bg-slate-900/10">
            <div className="flex border-b border-slate-800 mb-6 pb-1">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`flex-1 text-center py-2 text-sm font-semibold transition-all ${!isRegister ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-450 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`flex-1 text-center py-2 text-sm font-semibold transition-all ${isRegister ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-450 hover:text-slate-200'}`}
              >
                Register
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-455 font-semibold">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-slate-950/60"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Email Input (Register only) */}
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-455 font-semibold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-slate-950/60"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-455 font-semibold">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-slate-950/60"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {/* Role & Department Selection (Register only) */}
              {isRegister && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-455 font-semibold">Register As</label>
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
                      <label className="text-xs text-slate-455 font-semibold">Department Assigned</label>
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
          <div className="glass-panel p-5 rounded-2xl shadow-xl space-y-3.5 border border-slate-900 bg-slate-900/10">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-350">
                Quick Developer Logins
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('citizen', 'password')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
              >
                <span>Citizen</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('roads_officer', 'password')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
              >
                <span>Roads Officer</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('water_officer', 'password')}
                className="p-2.5 rounded-lg bg-slate-955 hover:bg-slate-900 border border-slate-900 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
              >
                <span>Water Officer</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('municipality_officer', 'password')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
              >
                <span>Municipality Officer</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('dept_head', 'password')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-300 hover:text-white transition-all text-left flex items-center justify-between"
              >
                <span>Roads Dept Head</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'password')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900 col-span-2 text-center text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-2"
              >
                <span>Administrator Portal</span>
                <ArrowRight className="w-3 h-3 text-slate-600 animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
