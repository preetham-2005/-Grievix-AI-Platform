import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

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
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  // Render appropriate dashboard view based on user role
  const renderDashboard = () => {
    if (!currentUser) return null;
    
    switch (currentUser.role) {
      case 'ROLE_CITIZEN':
        return <CitizenDashboard currentUser={currentUser} />;
      case 'ROLE_OFFICER':
        return <OfficerDashboard currentUser={currentUser} />;
      case 'ROLE_DEPT_HEAD':
      case 'ROLE_ADMIN':
      case 'ROLE_SUPER_ADMIN':
        return <AdminDashboard currentUser={currentUser} />;
      default:
        return (
          <div className="min-h-[50vh] flex items-center justify-center text-slate-400">
            Unauthorized role or corrupted session. Please log out.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {!currentUser ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar currentUser={currentUser} onLogout={handleLogout} />
          <main className="flex-1 w-full bg-slate-950 text-slate-100 pb-16">
            {renderDashboard()}
          </main>
        </>
      )}
    </div>
  );
}
