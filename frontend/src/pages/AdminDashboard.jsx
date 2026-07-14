import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  ShieldAlert, RefreshCw, Layers, CheckCircle2, AlertTriangle, 
  Search, Users, Activity, FileText, CheckCircle, X, Clock
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4'];

export default function AdminDashboard({ currentUser }) {
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slaMessage, setSlaMessage] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activePlot, setActivePlot] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (currentUser.role === 'ROLE_DEPT_HEAD') {
        // Fetch only department-specific complaints
        const compRes = await api.get('/complaints/department');
        const deptComplaints = compRes.data;
        setComplaints(deptComplaints);
        
        // Build local analytics specifically for this department
        const total = deptComplaints.length;
        
        // Category distribution mapping
        const catDist = {};
        deptComplaints.forEach(c => {
          catDist[c.category] = (catDist[c.category] || 0) + 1;
        });
        
        // Status distribution mapping
        const statusDist = {
          PENDING: deptComplaints.filter(c => c.status === 'PENDING').length,
          ASSIGNED: deptComplaints.filter(c => c.status === 'ASSIGNED').length,
          IN_PROGRESS: deptComplaints.filter(c => c.status === 'IN_PROGRESS').length,
          RESOLVED: deptComplaints.filter(c => c.status === 'RESOLVED').length,
          ESCALATED: deptComplaints.filter(c => c.status === 'ESCALATED').length,
          CLOSED: deptComplaints.filter(c => c.status === 'CLOSED').length
        };

        setAnalytics({
          totalComplaintsCount: total,
          averageResolutionTimeHours: 0,
          categoryDistribution: catDist,
          statusDistribution: statusDist
        });
      } else {
        // Full Admin - Global analytics
        const analRes = await api.get('/complaints/analytics');
        setAnalytics(analRes.data);

        const compRes = await api.get('/complaints/search');
        setComplaints(compRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerSlaCheck = async () => {
    setSlaMessage('Running check...');
    try {
      const response = await api.post('/complaints/escalate-check', {});
      setSlaMessage(response.data.message);
      fetchDashboardData();
      setTimeout(() => setSlaMessage(''), 5000);
    } catch (err) {
      setSlaMessage('Failed to trigger check.');
      setTimeout(() => setSlaMessage(''), 3000);
    }
  };

  // Process data for charts
  const getCategoryData = () => {
    if (!analytics?.categoryDistribution) return [];
    return Object.keys(analytics.categoryDistribution).map(key => ({
      name: key.replace('_', ' '),
      value: analytics.categoryDistribution[key]
    }));
  };

  const getStatusData = () => {
    if (!analytics?.statusDistribution) return [];
    return Object.keys(analytics.statusDistribution).map(key => ({
      name: key,
      value: analytics.statusDistribution[key]
    }));
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = searchQuery === '' || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toString().includes(searchQuery);
    
    const matchesCategory = filterCategory === '' || c.category === filterCategory;
    const matchesStatus = filterStatus === '' || c.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
        <div>
          <h1 className="text-3xl font-outfit font-extrabold text-white flex items-center space-x-2">
            <Activity className="w-8 h-8 text-rose-500" />
            <span>{currentUser.role === 'ROLE_DEPT_HEAD' ? `Grievix Department Head: ${currentUser.department?.replace('_', ' ')}` : 'Grievix Admin Portal'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {currentUser.role === 'ROLE_DEPT_HEAD' 
              ? 'Departmental metrics dashboard. Monitor workloads, active category coordinates, and SLA resolution performance.' 
              : 'Global metrics control room. Perform SLA checks, audit department routing logs, and monitor workload balancing parameters.'}
          </p>
        </div>
        
        {/* SLA Debug Button */}
        <div className="flex items-center space-x-3">
          {slaMessage && (
            <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-slate-350 font-mono">
              {slaMessage}
            </span>
          )}
          <button
            onClick={triggerSlaCheck}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
          >
            <ShieldAlert className="w-4.5 h-4.5" />
            <span>Force SLA Escalation Run</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-550 border-b border-slate-900 pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">Total complaints</span>
              <FileText className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-2xl font-black font-outfit text-white">{analytics.totalComplaintsCount}</h3>
          </div>
          
          <div className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between text-blue-400 border-b border-slate-900 pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">Active Cases</span>
              <Layers className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-2xl font-black font-outfit text-blue-400">
              {(analytics.statusDistribution?.ASSIGNED || 0) + (analytics.statusDistribution?.IN_PROGRESS || 0)}
            </h3>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between text-emerald-400 border-b border-slate-900 pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">Resolved Cases</span>
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-2xl font-black font-outfit text-emerald-400">
              {(analytics.statusDistribution?.RESOLVED || 0) + (analytics.statusDistribution?.CLOSED || 0)}
            </h3>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between text-rose-500 border-b border-slate-900 pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">Escalated Cases</span>
              <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black font-outfit text-rose-500">{analytics.statusDistribution?.ESCALATED || 0}</h3>
          </div>

          <div className="glass-panel p-5 rounded-2xl col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-amber-500 border-b border-slate-900 pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">Avg Resolution Time</span>
              <Clock className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-2xl font-black font-outfit text-amber-550">
              {analytics.averageResolutionTimeHours} hrs
            </h3>
          </div>
        </div>
      )}

      {/* Live Heatmap Map Component */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Municipal Operations Live Grievance Map</h3>
            <p className="text-[10px] text-slate-500">Spatial distribution of complaints mapped by coordinates across the city zone bounds.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* The SVG Map Canvas */}
          <div className="md:col-span-3 h-96 relative bg-slate-950/60 rounded-xl border border-slate-900 overflow-hidden flex items-center justify-center group">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b1a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b1a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Mock Map Outline */}
            <svg className="w-full h-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M20,30 Q30,15 50,20 T80,30 T90,60 T70,85 T40,80 T15,60 Z" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2" />
              <path d="M35,45 L40,55 L55,50 L60,35 Z" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              <path d="M50,20 L60,45 L80,50" fill="none" stroke="#1e293b" strokeWidth="0.3" />
              {/* Wards/sectors marker labels */}
              <text x="30" y="25" fill="#475569" fontSize="3" fontFamily="Outfit">WEST ZONE</text>
              <text x="65" y="40" fill="#475569" fontSize="3" fontFamily="Outfit">EAST ZONE</text>
              <text x="45" y="75" fill="#475569" fontSize="3" fontFamily="Outfit">SOUTH ZONE</text>
              <text x="75" y="70" fill="#475569" fontSize="3" fontFamily="Outfit">MAHADEVAPURA</text>
              <text x="48" y="10" fill="#475569" fontSize="3" fontFamily="Outfit">YELAHANKA</text>
            </svg>
            
            {/* Dynamic Complaint Plot Dots */}
            {complaints.map((c) => {
              const minLat = 12.80, maxLat = 13.12;
              const minLng = 77.50, maxLng = 77.80;
              
              // Scale to 0-100%
              let y = 100 - ((c.latitude - minLat) / (maxLat - minLat)) * 100;
              let x = ((c.longitude - minLng) / (maxLng - minLng)) * 100;
              
              // Clamp bounds to prevent overflow
              x = Math.max(5, Math.min(95, x));
              y = Math.max(5, Math.min(95, y));
              
              // Color based on status / priority
              let colorClass = "bg-blue-500 shadow-blue-500/50";
              if (c.status === 'ESCALATED' || c.priority === 'CRITICAL') {
                colorClass = "bg-rose-500 shadow-rose-500/50";
              } else if (c.priority === 'HIGH') {
                colorClass = "bg-amber-500 shadow-amber-500/50";
              } else if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
                colorClass = "bg-emerald-500 shadow-emerald-500/50";
              }
              
              return (
                <div
                  key={c.id}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => setActivePlot(c)}
                  className={`absolute w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-125 transition-transform border border-slate-950 flex items-center justify-center group/dot ${colorClass} shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                  title={`#${c.id}: ${c.title}`}
                >
                  {/* Pulsing ring for active issues */}
                  {(c.status !== 'RESOLVED' && c.status !== 'CLOSED') && (
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                      c.status === 'ESCALATED' || c.priority === 'CRITICAL' ? 'bg-rose-500' : c.priority === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}></span>
                  )}
                </div>
              );
            })}

            {/* Floating map popup card overlay */}
            {activePlot && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl flex justify-between items-start z-10 animate-fade-in">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[9px] text-slate-500">CASE ID: #{activePlot.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      activePlot.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-450 animate-pulse' : activePlot.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-850 text-slate-350'
                    }`}>
                      {activePlot.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">{activePlot.title}</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed max-w-md line-clamp-1">{activePlot.description}</p>
                  <div className="flex space-x-3 text-[9px] text-slate-550 font-semibold pt-1">
                    <span>Area: {activePlot.area}</span>
                    <span>Priority: {activePlot.priority}</span>
                    <span>Assigned: {activePlot.officerName}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActivePlot(null)}
                  className="p-1 rounded bg-slate-950 border border-slate-850 hover:text-white text-slate-450"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Map stats sidebar legend */}
          <div className="md:col-span-1 space-y-4 flex flex-col justify-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-1.5">Map Legend</h4>
            <div className="space-y-3.5 text-xs text-slate-350">
              <div className="flex items-center space-x-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-slate-950 flex-shrink-0 animate-pulse"></span>
                <div>
                  <span className="font-semibold text-slate-200 block leading-tight">Critical / Escalated</span>
                  <span className="text-[10px] text-slate-500">SLA breached or high-risk spark hazards</span>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-slate-950 flex-shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200 block leading-tight">High Priority</span>
                  <span className="text-[10px] text-slate-500">Assigned water main or road repairs</span>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-slate-950 flex-shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200 block leading-tight">Medium / Low</span>
                  <span className="text-[10px] text-slate-500">Standard street lamp or parking complaints</span>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-950 flex-shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200 block leading-tight">Resolved / Closed</span>
                  <span className="text-[10px] text-slate-500">Field work completed and citizen feedback verified</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1 mt-2 text-[10px] text-slate-450 leading-relaxed">
              <span className="font-bold text-slate-350 block">Spatial Bounds:</span>
              <span>Mapping coordinate bounds: Lat [12.80 - 13.12] North, Lng [77.50 - 77.80] East. Plots auto-align.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pie Chart: Complaints by Category */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Complaints by Category</h3>
          <div className="h-64">
            {getCategoryData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-550">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getCategoryData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {getCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart: Complaints by Status */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Complaints by Status</h3>
          <div className="h-64">
            {getStatusData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-550">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getStatusData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {getStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'ESCALATED' ? '#f43f5e' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Database Search Queue */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-900">
          <h3 className="text-lg font-bold font-outfit text-white">Central Grievance Ledger</h3>
          
          <button
            onClick={fetchDashboardData}
            className="self-end p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-450 hover:bg-slate-850 active:scale-95 transition-all"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-550" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or keywords..."
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-xs"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="glass-input w-full px-3 py-2.5 rounded-lg text-xs appearance-none bg-slate-900"
          >
            <option value="">All Categories</option>
            <option value="ROAD_DAMAGE">Road Damage</option>
            <option value="GARBAGE">Garbage</option>
            <option value="WATER_LEAKAGE">Water Leakage</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="STREET_LIGHT">Street Light</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="ILLEGAL_PARKING">Illegal Parking</option>
            <option value="OTHERS">Others</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-input w-full px-3 py-2.5 rounded-lg text-xs appearance-none bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-900">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-slate-450 uppercase tracking-wider font-semibold border-b border-slate-900">
              <tr>
                <th className="p-4 w-16">ID</th>
                <th className="p-4">Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Department</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Status</th>
                <th className="p-4">Filed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium bg-slate-900/10">
                    No complaints match current filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-400">#{c.id}</td>
                    <td className="p-4 font-semibold text-slate-200">
                      <div className="max-w-[200px] truncate">{c.title}</div>
                      <span className="text-[10px] text-slate-500 font-medium block">{c.area}</span>
                    </td>
                    <td className="p-4 font-medium text-slate-350">{c.category?.replace('_', ' ')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400' : c.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-450'}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-350">{c.department?.replace('_', ' ')}</td>
                    <td className="p-4 text-slate-400">{c.officerName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-450 animate-pulse' : c.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-800 text-slate-450'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {new Date(c.createdDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
