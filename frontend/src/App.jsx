import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    // Check local storage for active session on load
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userStr && token) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    const userObj = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      department: data.department
    };
    localStorage.setItem('user', JSON.stringify(userObj));
    setCurrentUser(userObj);
    showToast(`Logged in successfully as ${userObj.username}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCurrentUser(null);
    showToast('Logged out successfully.', 'info');
  };

  // Render appropriate dashboard view based on user role
  const renderDashboard = () => {
    if (!currentUser) return null;
    
    switch (currentUser.role) {
      case 'ROLE_CITIZEN':
        return <CitizenDashboard currentUser={currentUser} showToast={showToast} />;
      case 'ROLE_OFFICER':
        return <OfficerDashboard currentUser={currentUser} showToast={showToast} />;
      case 'ROLE_DEPT_HEAD':
      case 'ROLE_ADMIN':
      case 'ROLE_SUPER_ADMIN':
        return <AdminDashboard currentUser={currentUser} showToast={showToast} />;
      default:
        return (
          <div className="min-h-[50vh] flex items-center justify-center text-slate-400">
            Unauthorized role or corrupted session. Please log out.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1">
        {currentUser ? renderDashboard() : <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />}
      </main>

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-panel p-4 rounded-xl shadow-2xl border flex items-center justify-between space-x-3 pointer-events-auto transition-all duration-300 select-none ${
              t.type === 'success' 
                ? 'border-emerald-500/20 bg-emerald-950/85 text-emerald-300' 
                : t.type === 'error' 
                ? 'border-rose-500/20 bg-rose-950/85 text-rose-300' 
                : 'border-slate-800 bg-slate-900/95 text-slate-350'
            }`}
          >
            <span className="text-xs font-semibold">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
