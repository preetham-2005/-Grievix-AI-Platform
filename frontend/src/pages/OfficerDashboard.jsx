import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  CheckCircle, Clock, AlertTriangle, MessageSquare, Wrench, 
  MapPin, Sparkles, Navigation, X, Upload, CheckSquare
} from 'lucide-react';

const RESOLUTION_IMAGES = [
  { label: 'Paved Road', url: '/presets/road_damage.png' },
  { label: 'Cleaned Alley', url: '/presets/garbage.png' },
  { label: 'Fixed Pipeline', url: '/presets/water_leakage.png' },
  { label: 'Restored Light', url: '/presets/electricity.png' },
];

export default function OfficerDashboard({ currentUser }) {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Status update states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusToSet, setStatusToSet] = useState('IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImgUrl, setResolutionImgUrl] = useState('');
  const [selectedResImgIdx, setSelectedResImgIdx] = useState(-1);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      // Fetch complaints for current officer's department
      const response = await api.get('/complaints/department');
      
      // Filter list in UI to only show ones assigned to current officer
      const assignedToMe = response.data.filter(c => c.officerId === currentUser.id);
      setComplaints(assignedToMe);
      
      // If selectedComplaint exists, refresh it too
      if (selectedComplaint) {
        const updatedSelected = response.data.find(c => c.id === selectedComplaint.id);
        if (updatedSelected) setSelectedComplaint(updatedSelected);
      }
    } catch (err) {
      console.error('Error fetching officer complaints', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handlePresetSelect = (url, idx) => {
    setSelectedResImgIdx(idx);
    setResolutionImgUrl(url);
    setIsCustomUpload(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResolutionImgUrl(response.data.url);
      setIsCustomUpload(true);
      setSelectedResImgIdx(-1);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Proof photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put(`/complaints/${selectedComplaint.id}/status?status=${statusToSet}&notes=${encodeURIComponent(resolutionNotes)}&resolutionImageUrl=${encodeURIComponent(resolutionImgUrl)}`, {});
      
      setSelectedComplaint(response.data);
      setShowStatusModal(false);
      setResolutionNotes('');
      setResolutionImgUrl('');
      setSelectedResImgIdx(-1);
      setIsCustomUpload(false);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-rose-450 bg-rose-500/10 border border-rose-500/20 font-bold';
      case 'HIGH': return 'text-amber-500 bg-amber-500/10 border border-amber-500/20';
      case 'MEDIUM': return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
      case 'LOW': return 'text-slate-400 bg-slate-500/10 border border-slate-500/20';
      default: return 'text-slate-400';
    }
  };

  const isOverdue = (deadlineStr, status) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return false;
    const deadline = new Date(deadlineStr);
    return new Date() > deadline;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-8 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-outfit">
            Officer Dashboard: <span className="text-emerald-450">{currentUser.username}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Managing Department: <span className="font-semibold text-slate-200">{currentUser.department?.replace('_', ' ') || 'General'}</span>.
            Review tasks assigned to you, address critical SLA deadlines, and submit resolution logs.
          </p>
        </div>
      </div>

      {/* Main split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left List of Assigned Complaints */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h2 className="text-lg font-bold font-outfit text-slate-200 flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              <span>Assigned Grievances ({complaints.length})</span>
            </h2>
          </div>

          {complaints.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-slate-550 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-350">You have no active assignments</h3>
              <p className="text-xs text-slate-550">Great job! All grievances in your queue are resolved.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {complaints.map((c) => {
                const overdue = isOverdue(c.slaDeadline, c.status);
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex justify-between items-start ${selectedComplaint?.id === c.id ? 'border-emerald-500 bg-slate-900/60 ring-1 ring-emerald-500/20' : 'glass-panel-hover'}`}
                  >
                    <div className="space-y-2 flex-1 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getPriorityColor(c.priority)}`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-850 text-slate-400 border border-slate-750">
                          {c.status}
                        </span>
                        {overdue && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 border border-rose-500/25 font-bold uppercase animate-pulse">
                            SLA BREACHED
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-slate-200 font-outfit">{c.title}</h3>
                      <p className="text-xs text-slate-450 line-clamp-2">{c.description}</p>
                      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-550 font-medium">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.area}, {c.ward}</span>
                        </span>
                        <span>SLA Limit: {new Date(c.slaDeadline).toLocaleString()}</span>
                      </div>
                    </div>
                    {c.imageUrl && (
                      <img 
                        src={c.imageUrl} 
                        alt="Incident" 
                        className="w-16 h-16 rounded-xl object-cover border border-slate-800 shadow"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-1">
          {selectedComplaint ? (
            <div className="glass-panel p-6 rounded-2xl space-y-6 text-left animate-fade-in sticky top-28">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">CASE ID: #{selectedComplaint.id}</span>
                  <h3 className="text-lg font-bold font-outfit text-slate-250 mt-0.5">{selectedComplaint.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 rounded bg-slate-900 border border-slate-850 hover:text-white text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              {selectedComplaint.status !== 'RESOLVED' && selectedComplaint.status !== 'CLOSED' && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedComplaint.status === 'ASSIGNED' && (
                    <button
                      onClick={() => { setStatusToSet('IN_PROGRESS'); setShowStatusModal(true); }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Start Working</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setStatusToSet('RESOLVED'); setShowStatusModal(true); }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow col-span-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolve Complaint</span>
                  </button>
                </div>
              )}

              {/* Details and Description */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Description</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-900/10 p-3 rounded-lg border border-slate-850/60 mt-1">
                    {selectedComplaint.description}
                  </p>
                </div>

                {selectedComplaint.imageUrl && (
                  <div>
                    <span className="text-slate-500 font-medium block mb-1">Grievance Photo</span>
                    <img 
                      src={selectedComplaint.imageUrl} 
                      alt="Incident" 
                      className="w-full h-40 rounded-xl object-cover border border-slate-800 shadow-sm"
                    />
                  </div>
                )}

                {/* AI Assistant Help */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/25 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold">
                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                    <span>AI Recommended Action Plan</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {/* Generates a smart suggestion based on category */}
                    {selectedComplaint.category === 'ROAD_DAMAGE' && 'Evaluate pothole size, arrange for cold asphalt patch mix, and coordinate traffic safety cones.'}
                    {selectedComplaint.category === 'WATER_LEAKAGE' && 'Locate branch valve, isolate municipal leak, excavate main duct, and weld replacement collar.'}
                    {selectedComplaint.category === 'ELECTRICITY' && 'Disconnect phase breaker from distribution substation, inspect transformer bushings, and replace burnt fuses.'}
                    {selectedComplaint.category === 'GARBAGE' && 'Request dump container dispatch, clean perimeter using sanitation crews, and deploy garbage bin placards.'}
                    {!['ROAD_DAMAGE', 'WATER_LEAKAGE', 'ELECTRICITY', 'GARBAGE'].includes(selectedComplaint.category) && 'Review details, dispatch standard inspection crew, and log timeline completion.'}
                  </p>
                </div>

                {/* Resolution proof */}
                {selectedComplaint.status === 'RESOLVED' && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <span className="text-emerald-400 font-bold block">Your Resolution Details</span>
                    <p className="text-slate-350 italic">"{selectedComplaint.resolutionNotes}"</p>
                    {selectedComplaint.resolutionImageUrl && (
                      <img 
                        src={selectedComplaint.resolutionImageUrl} 
                        alt="Resolution" 
                        className="w-full h-32 rounded-lg object-cover border border-slate-800"
                      />
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Timeline History</span>
                  <div className="relative pl-6 space-y-4 timeline-line">
                    {selectedComplaint.timeline?.map((event, idx) => (
                      <div key={event.id || idx} className="relative text-xs">
                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-450 uppercase tracking-wider">{event.status}</span>
                          <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-350 mt-1 leading-relaxed">{event.comment}</p>
                        <span className="text-[10px] text-slate-500 italic block mt-0.5">By: {event.updatedByName}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl text-center space-y-2 text-slate-450">
              <MessageSquare className="w-8 h-8 text-slate-650 mx-auto" />
              <p className="text-xs font-medium">Select a grievance from the left column to view its location coordinates, detailed incident description, AI routing parameters, and to initiate work status modifications.</p>
            </div>
          )}
        </div>

      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl shadow-2xl relative space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-outfit text-white">
                {statusToSet === 'IN_PROGRESS' ? 'Acknowledge Work' : 'Submit Resolution'}
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded bg-slate-900 border border-slate-850 hover:text-white text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              {statusToSet === 'IN_PROGRESS' ? (
                <div className="space-y-2 text-xs text-slate-350 leading-relaxed">
                  <p>You are moving this case to <strong>IN PROGRESS</strong>. This signifies to citizens and department heads that field operations have commenced.</p>
                  <p>Click below to confirm status transition.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-450 font-semibold">Resolution Comments</label>
                    <textarea
                      required
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Detail the work carried out (e.g. Cleared 5 tons of trash, patched pothole with hot bituminous concrete)..."
                      className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-455 font-semibold flex items-center space-x-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-450" />
                      <span>Attach Resolution Proof (Real Upload or Presets)</span>
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Real File Upload Container */}
                      <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl flex flex-col justify-center items-center space-y-1.5 group hover:border-slate-700 transition-colors min-h-[66px]">
                        <input
                          type="file"
                          id="officer-proof-upload"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <label htmlFor="officer-proof-upload" className="cursor-pointer flex flex-col items-center space-y-1 text-slate-400 group-hover:text-slate-200">
                          <Upload className="w-4.5 h-4.5 text-slate-550 group-hover:text-emerald-450 transition-colors" />
                          <span className="text-[10px] font-semibold">
                            {isUploading ? 'Uploading proof...' : 'Choose Image File'}
                          </span>
                        </label>
                      </div>

                      {/* Presets Selection */}
                      <div className="grid grid-cols-2 gap-1 bg-slate-950/40 p-1.5 rounded-xl border border-slate-850">
                        {RESOLUTION_IMAGES.map((img, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handlePresetSelect(img.url, idx)}
                            className={`p-1.5 rounded text-[8px] text-center font-medium truncate transition-all ${selectedResImgIdx === idx && !isCustomUpload ? 'bg-emerald-600/10 border-emerald-500 text-emerald-450 font-bold' : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-750'}`}
                          >
                            {img.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {resolutionImgUrl && (
                      <div className="mt-3 relative w-full h-24 rounded-lg overflow-hidden border border-slate-800">
                        <img src={resolutionImgUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2 flex items-end justify-between">
                          <span className="text-[9px] font-bold text-slate-350">
                            {isCustomUpload ? 'Uploaded Resolution Photo' : 'Preset Proof Selected'}
                          </span>
                          {isCustomUpload && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 font-bold uppercase">
                              Real File
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors text-center"
              >
                {loading ? 'Processing...' : 'Confirm Status Update'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
