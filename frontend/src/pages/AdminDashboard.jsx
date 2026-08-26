import React, { useState, useEffect, useRef } from 'react';
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

export default function AdminDashboard({ currentUser, showToast }) {
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slaMessage, setSlaMessage] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activePlot, setActivePlot] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [markersGroup, setMarkersGroup] = useState(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);

  // Manual Override States
  const [officers, setOfficers] = useState([]);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overrideDept, setOverrideDept] = useState('');
  const [overrideOfficerId, setOverrideOfficerId] = useState('');

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/complaints/officers');
      setOfficers(res.data);
    } catch (err) {
      console.error('Error fetching officers', err);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  useEffect(() => {
    if (activePlot) {
      setOverrideCategory(activePlot.category || '');
      setOverrideDept(activePlot.department || '');
      setOverrideOfficerId(activePlot.officerId || '');
      setShowOverridePanel(false);
    }
  }, [activePlot]);

  const handleOverrideSubmit = async () => {
    try {
      const officerParam = overrideOfficerId === '' ? -1 : overrideOfficerId;
      const res = await api.put(
        `/complaints/${activePlot.id}/override?category=${overrideCategory}&department=${overrideDept}&officerId=${officerParam}`,
        {}
      );
      setActivePlot(res.data);
      fetchDashboardData();
      showToast('AI routing manually overridden successfully!', 'success');
      setShowOverridePanel(false);
    } catch (err) {
      console.error('Failed to override routing', err);
      showToast('Failed to override routing assignment.', 'error');
    }
  };

  const handleCsvExport = async () => {
    try {
      const deptParam = currentUser.role === 'ROLE_DEPT_HEAD' ? currentUser.department : '';
      const res = await api.get(
        `/complaints/export?category=${filterCategory}&status=${filterStatus}&department=${deptParam}&query=${searchQuery}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'grievix_complaints_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Report CSV successfully generated and downloaded.', 'success');
    } catch (err) {
      console.error('Failed to export CSV report', err);
      showToast('CSV export failed. Please try again.', 'error');
    }
  };

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

  // Initialize Leaflet Map
  useEffect(() => {
    const mapEl = document.getElementById('admin-map');
    if (mapEl && window.L && !mapRef.current) {
      const map = window.L.map('admin-map').setView([12.9716, 77.5946], 12);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map &copy; OpenStreetMap contributors'
      }).addTo(map);

      const layerGroup = window.L.layerGroup().addTo(map);
      mapRef.current = map;
      markersRef.current = layerGroup;
      setMapInstance(map);
      setMarkersGroup(layerGroup);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        setMapInstance(null);
        setMarkersGroup(null);
      }
    };
  }, []);

  // Plot dynamic markers whenever complaints list changes
  useEffect(() => {
    if (mapInstance && markersGroup && complaints && window.L) {
      markersGroup.clearLayers();

      complaints.forEach(c => {
        if (c.latitude && c.longitude) {
          let color = '#3b82f6'; // default blue
          if (c.status === 'ESCALATED' || c.priority === 'CRITICAL') {
            color = '#f43f5e'; // red
          } else if (c.priority === 'HIGH') {
            color = '#f59e0b'; // orange
          } else if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
            color = '#10b981'; // green
          }

          const customIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2px solid #020617; border-radius: 50%; box-shadow: 0 0 8px ${color}; cursor: pointer;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const marker = window.L.marker([c.latitude, c.longitude], { icon: customIcon });

          marker.on('click', () => {
            setActivePlot(c);
          });

          marker.bindTooltip(`#${c.id}: ${c.title}`, { direction: 'top', offset: [0, -7] });
          markersGroup.addLayer(marker);
        }
      });
    }
  }, [mapInstance, markersGroup, complaints]);

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
          {/* The Leaflet Map Canvas */}
          <div className="md:col-span-3 h-96 relative bg-slate-950/60 rounded-xl border border-slate-900 overflow-hidden z-10 flex flex-col">
            <div id="admin-map" className="w-full h-full"></div>

            {/* Floating map popup card overlay */}
            {activePlot && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl flex justify-between items-start z-[1000] animate-fade-in text-left">
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[9px] text-slate-500">CASE ID: #{activePlot.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      activePlot.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-450 animate-pulse' : activePlot.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-850 text-slate-350'
                    }`}>
                      {activePlot.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200">{activePlot.title}</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed max-w-xl line-clamp-1">{activePlot.description}</p>
                  
                  {showOverridePanel ? (
                    <div className="mt-3 pt-3 border-t border-slate-850 space-y-3">
                      <span className="text-blue-400 font-bold block text-[10px] uppercase tracking-wider">Override AI Assignment Routing</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] text-slate-500 font-semibold">Category</span>
                          <select
                            value={overrideCategory}
                            onChange={(e) => setOverrideCategory(e.target.value)}
                            className="px-2 py-1 rounded text-xs text-slate-300 bg-slate-950 border border-slate-850 focus:outline-none"
                          >
                            <option value="ROAD_DAMAGE">Road Damage</option>
                            <option value="GARBAGE">Garbage</option>
                            <option value="WATER_LEAKAGE">Water Leakage</option>
                            <option value="ELECTRICITY">Electricity</option>
                            <option value="STREET_LIGHT">Street Light</option>
                            <option value="DRAINAGE">Drainage</option>
                            <option value="ILLEGAL_PARKING">Illegal Parking</option>
                            <option value="OTHERS">Others</option>
                          </select>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] text-slate-500 font-semibold">Department</span>
                          <select
                            value={overrideDept}
                            onChange={(e) => setOverrideDept(e.target.value)}
                            className="px-2 py-1 rounded text-xs text-slate-300 bg-slate-950 border border-slate-850 focus:outline-none"
                          >
                            <option value="CIVIC_WORKS">Civic Works</option>
                            <option value="MUNICIPALITY">Municipality</option>
                            <option value="WATER_SUPPLY">Water Supply</option>
                            <option value="ELECTRICAL">Electrical</option>
                            <option value="OTHERS">Others</option>
                          </select>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] text-slate-500 font-semibold">Assign Officer</span>
                          <select
                            value={overrideOfficerId}
                            onChange={(e) => setOverrideOfficerId(e.target.value)}
                            className="px-2 py-1 rounded text-xs text-slate-300 bg-slate-950 border border-slate-850 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {officers
                              .filter((o) => o.department === overrideDept)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.username}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button
                          onClick={handleOverrideSubmit}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow-md active:scale-95 transition-all"
                        >
                          Save Override
                        </button>
                        <button
                          onClick={() => setShowOverridePanel(false)}
                          className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 space-y-2 sm:space-y-0">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-500 font-semibold">
                        <span>Area: {activePlot.area}</span>
                        <span>Priority: {activePlot.priority}</span>
                        <span>Assigned: {activePlot.officerName || 'Unassigned'}</span>
                        <span>Dept: {activePlot.department?.replace('_', ' ')}</span>
                      </div>
                      {(currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ROLE_SUPER_ADMIN') && (
                        <button
                          onClick={() => setShowOverridePanel(true)}
                          className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/35 rounded text-[10px] font-bold transition-all ml-0 sm:ml-4 self-start sm:self-auto"
                        >
                          Re-Route Assignment
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActivePlot(null)}
                  className="p-1 rounded bg-slate-950 border border-slate-850 hover:text-white text-slate-450 ml-4"
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
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Complaints by Category (Click slice to filter)</h3>
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
                    onClick={(data) => {
                      if (data && data.name) {
                        setFilterCategory(data.name);
                        showToast(`Filtered database ledger to ${data.name.replace('_', ' ')} category.`, 'info');
                        document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="cursor-pointer"
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
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Complaints by Status (Click bar to filter)</h3>
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
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      if (data && data.name) {
                        setFilterStatus(data.name);
                        showToast(`Filtered database ledger to ${data.name} status.`, 'info');
                        document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="cursor-pointer"
                  >
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
      <div id="ledger-section" className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-900">
          <h3 className="text-lg font-bold font-outfit text-white">Central Grievance Ledger</h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCsvExport}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/35 active:scale-95 transition-all text-xs font-semibold"
              title="Export filtered grievances to CSV file"
            >
              <FileText className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={fetchDashboardData}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-450 hover:bg-slate-850 active:scale-95 transition-all"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
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
                  <tr 
                    key={c.id} 
                    onClick={() => {
                      setActivePlot(c);
                      window.scrollTo({ top: 250, behavior: 'smooth' });
                    }}
                    className="hover:bg-slate-900/35 transition-colors cursor-pointer"
                  >
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
