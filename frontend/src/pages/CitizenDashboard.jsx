import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  PlusCircle, List, Clock, CheckCircle, AlertCircle, MapPin, 
  Upload, Star, Sparkles, Navigation, X, Info
} from 'lucide-react';

const BENGALURU_HOTSPOTS = [
  { name: 'Shanti Nagar', ward: 'Ward 15', lat: 12.9716, lng: 77.5946, city: 'Bengaluru' },
  { name: 'HSR Layout', ward: 'Ward 32', lat: 12.9279, lng: 77.6271, city: 'Bengaluru' },
  { name: 'Indiranagar', ward: 'Ward 8', lat: 12.9784, lng: 77.6408, city: 'Bengaluru' },
  { name: 'Whitefield', ward: 'Ward 54', lat: 12.9698, lng: 77.7500, city: 'Bengaluru' },
  { name: 'Koramangala', ward: 'Ward 21', lat: 12.9352, lng: 77.6245, city: 'Bengaluru' },
  { name: 'Electronic City', ward: 'Ward 60', lat: 12.8399, lng: 77.6770, city: 'Bengaluru' },
  { name: 'Jayanagar', ward: 'Ward 45', lat: 12.9299, lng: 77.5824, city: 'Bengaluru' },
  { name: 'Malleshwaram', ward: 'Ward 3', lat: 12.9982, lng: 77.5703, city: 'Bengaluru' },
  { name: 'Rajajinagar', ward: 'Ward 10', lat: 12.9896, lng: 77.5539, city: 'Bengaluru' },
  { name: 'Banashankari', ward: 'Ward 52', lat: 12.9254, lng: 77.5468, city: 'Bengaluru' },
  { name: 'Hebbal', ward: 'Ward 1', lat: 13.0354, lng: 77.5988, city: 'Bengaluru' },
  { name: 'Marathahalli', ward: 'Ward 48', lat: 12.9569, lng: 77.7011, city: 'Bengaluru' },
  { name: 'Bellandur', ward: 'Ward 35', lat: 12.9304, lng: 77.6784, city: 'Bengaluru' },
  { name: 'Yelahanka', ward: 'Ward 2', lat: 13.1007, lng: 77.5963, city: 'Bengaluru' },
  { name: 'BTM Layout', ward: 'Ward 25', lat: 12.9166, lng: 77.6101, city: 'Bengaluru' },
  { name: 'JP Nagar', ward: 'Ward 27', lat: 12.9063, lng: 77.5857, city: 'Bengaluru' },
  { name: 'Domlur', ward: 'Ward 18', lat: 12.9610, lng: 77.6387, city: 'Bengaluru' },
  { name: 'Basavanagudi', ward: 'Ward 12', lat: 12.9417, lng: 77.5755, city: 'Bengaluru' },
];

const IMAGE_PRESETS = {
  ROAD_DAMAGE: '/presets/road_damage.png',
  GARBAGE: '/presets/garbage.png',
  WATER_LEAKAGE: '/presets/water_leakage.png',
  ELECTRICITY: '/presets/electricity.png',
  STREET_LIGHT: '/presets/street_light.png',
  OTHERS: '/presets/others.png',
};

export default function CitizenDashboard({ currentUser }) {
  const [complaints, setComplaints] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Submit Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCategory, setImageCategory] = useState('ROAD_DAMAGE');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // AI Loading & Result state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Feedback State
  const [rating, setRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // Fetch Citizen Complaints
  const fetchComplaints = async () => {
    try {
      const response = await api.get('/complaints/citizen');
      setComplaints(response.data);
    } catch (err) {
      console.error('Error fetching complaints', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Initialize Leaflet Map inside filing modal dynamically
  useEffect(() => {
    if (showSubmitModal && !aiResult && !aiAnalyzing) {
      const timer = setTimeout(() => {
        const mapEl = document.getElementById('citizen-map');
        if (mapEl && window.L && !mapRef.current) {
          const defaultHotspot = BENGALURU_HOTSPOTS[selectedHotspot];
          
          const map = window.L.map('citizen-map').setView([defaultHotspot.lat, defaultHotspot.lng], 13);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Map &copy; OpenStreetMap'
          }).addTo(map);

          const marker = window.L.marker([defaultHotspot.lat, defaultHotspot.lng], {
            draggable: true
          }).addTo(map);

          setLatitude(defaultHotspot.lat);
          setLongitude(defaultHotspot.lng);

          marker.on('dragend', function (e) {
            const pos = marker.getLatLng();
            setLatitude(pos.lat);
            setLongitude(pos.lng);

            // Find closest hotspot to automatically highlight in dropdown
            let closestIdx = 0;
            let minDistance = Infinity;
            BENGALURU_HOTSPOTS.forEach((spot, idx) => {
              const d = Math.pow(spot.lat - pos.lat, 2) + Math.pow(spot.lng - pos.lng, 2);
              if (d < minDistance) {
                minDistance = d;
                closestIdx = idx;
              }
            });
            setSelectedHotspot(closestIdx);
          });

          map.on('click', function (e) {
            marker.setLatLng(e.latlng);
            setLatitude(e.latlng.lat);
            setLongitude(e.latlng.lng);

            // Find closest hotspot to automatically highlight in dropdown
            let closestIdx = 0;
            let minDistance = Infinity;
            BENGALURU_HOTSPOTS.forEach((spot, idx) => {
              const d = Math.pow(spot.lat - e.latlng.lat, 2) + Math.pow(spot.lng - e.latlng.lng, 2);
              if (d < minDistance) {
                minDistance = d;
                closestIdx = idx;
              }
            });
            setSelectedHotspot(closestIdx);
          });

          mapRef.current = map;
          markerRef.current = marker;
          setMapInstance(map);
          setMarkerInstance(marker);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    } else {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapInstance(null);
        setMarkerInstance(null);
      }
    }
  }, [showSubmitModal, aiResult, aiAnalyzing]);

  const handleHotspotChange = (index) => {
    setSelectedHotspot(index);
    const hotspot = BENGALURU_HOTSPOTS[index];
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([hotspot.lat, hotspot.lng], 13);
      markerRef.current.setLatLng([hotspot.lat, hotspot.lng]);
    }
    setLatitude(hotspot.lat);
    setLongitude(hotspot.lng);
  };

  const handlePresetImageChange = (categoryKey) => {
    setImageCategory(categoryKey);
    setImageUrl(IMAGE_PRESETS[categoryKey]);
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
      setImageUrl(response.data.url);
      setIsCustomUpload(true);
      setImageCategory(''); // clear preset highlight
    } catch (err) {
      console.error('Upload failed', err);
      alert('Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setAiAnalyzing(true);
    setAiResult(null);

    const hotspot = BENGALURU_HOTSPOTS[selectedHotspot];
    const payload = {
      title,
      description,
      latitude,
      longitude,
      ward: hotspot.ward,
      area: hotspot.name,
      city: hotspot.city,
      imageUrl: imageUrl || IMAGE_PRESETS.OTHERS,
    };

    try {
      const response = await api.post('/complaints', payload);

      // Simulate a small delay for the AI response to show the processing state
      setTimeout(() => {
        setAiResult(response.data);
        setAiAnalyzing(false);
        fetchComplaints();
        // Clear fields
        setTitle('');
        setDescription('');
        setImageUrl('');
        setIsCustomUpload(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      alert('Error submitting grievance.');
      setAiAnalyzing(false);
    }
  };

  const handleFeedbackSubmit = async (complaintId) => {
    try {
      const response = await api.put(
        `/complaints/${complaintId}/feedback?rating=${rating}&notes=${encodeURIComponent(feedbackNotes)}`,
        {}
      );
      setSelectedComplaint(response.data);
      setFeedbackNotes('');
      fetchComplaints();
    } catch (err) {
      console.error('Error submitting feedback', err);
      alert('Failed to submit feedback.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-5 h-5 text-slate-400" />;
      case 'ASSIGNED':
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'RESOLVED': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'ESCALATED': return <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce" />;
      case 'CLOSED': return <CheckCircle className="w-5 h-5 text-slate-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'ASSIGNED': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/20';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'ESCALATED': return 'bg-rose-500/10 text-rose-450 border border-rose-500/25';
      case 'CLOSED': return 'bg-slate-700/25 text-slate-550 border border-slate-700/30';
      default: return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-outfit">
            Welcome back, <span className="text-blue-500">{currentUser.username}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Submit public issues, track resolution metrics in real time, and let our AI categorize and assign them instantly.
          </p>
        </div>
        <button
          onClick={() => { setShowSubmitModal(true); setAiResult(null); }}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all hover:scale-[1.02]"
        >
          <PlusCircle className="w-5 h-5" />
          <span>File a New Grievance</span>
        </button>
      </div>

      {/* Resolved Alerts Notification Banner */}
      {complaints.filter(c => c.status === 'RESOLVED').length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 text-left">
          <div className="flex items-start space-x-3 text-left">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Grievance Resolution Pending Your Review!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Your reported issue regarding <span className="font-semibold text-emerald-450">"{complaints.filter(c => c.status === 'RESOLVED')[0].title}"</span> has been marked as RESOLVED by the department. Please review the resolution proof and submit your feedback to officially close the case.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedComplaint(complaints.filter(c => c.status === 'RESOLVED')[0])}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/10 active:scale-[0.98] transition-all ml-0 sm:ml-4 whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <span>Review & Rate</span>
          </button>
        </div>
      )}

      {/* Main Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Complaints List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-lg font-bold font-outfit text-slate-200 flex items-center space-x-2">
              <List className="w-5 h-5 text-blue-400" />
              <span>Your Registered Grievances ({complaints.length})</span>
            </h2>
          </div>

          {complaints.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-350">No complaints registered yet</h3>
              <p className="text-xs text-slate-550">Click "File a New Grievance" above to submit your first issue.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex justify-between items-start ${selectedComplaint?.id === c.id ? 'border-blue-500 bg-slate-900/60 ring-1 ring-blue-500/20' : 'glass-panel-hover'}`}
                >
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                        {c.category?.replace('_', ' ') || 'AI Analyzing'}
                      </span>
                      {c.priority === 'CRITICAL' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase">
                          Critical Priority
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-200 font-outfit">{c.title}</h3>
                    <p className="text-xs text-slate-450 line-clamp-2">{c.description}</p>
                    <div className="flex items-center space-x-4 pt-2 text-[10px] text-slate-550 font-medium">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.area}, {c.city}</span>
                      </span>
                      <span>Filed: {new Date(c.createdDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {c.imageUrl && (
                    <img 
                      src={c.imageUrl} 
                      alt="Complaint" 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-800 shadow"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Timeline and Detailed View */}
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
                  className="p-1 rounded bg-slate-900 border border-slate-800 hover:text-white text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* General details */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-850">
                  <div>
                    <span className="text-slate-500 font-medium block">Category</span>
                    <span className="text-slate-300 font-semibold">{selectedComplaint.category?.replace('_', ' ') || 'AI Analyzing'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Priority</span>
                    <span className={`font-bold ${selectedComplaint.priority === 'CRITICAL' || selectedComplaint.priority === 'HIGH' ? 'text-rose-400' : 'text-slate-350'}`}>
                      {selectedComplaint.priority || 'AI Analyzing'}
                    </span>
                  </div>
                  <div className="mt-2 col-span-2">
                    <span className="text-slate-500 font-medium block">Routed Department</span>
                    <span className="text-slate-300 font-semibold">{selectedComplaint.department?.replace('_', ' ') || 'Routing...'}</span>
                  </div>
                  <div className="mt-2 col-span-2 border-t border-slate-850/60 pt-2">
                    <span className="text-slate-500 font-medium block">Assigned Officer</span>
                    <span className="text-slate-300 font-semibold">{selectedComplaint.officerName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 font-medium block">Location Context</span>
                  <p className="text-slate-350 bg-slate-900/20 p-2 rounded border border-slate-850/40 flex items-center space-x-1">
                    <Navigation className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span>{selectedComplaint.area} ({selectedComplaint.ward}), Lat: {selectedComplaint.latitude}, Lng: {selectedComplaint.longitude}</span>
                  </p>
                </div>

                {/* Resolution Report */}
                {selectedComplaint.status === 'RESOLVED' && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                      <CheckCircle className="w-4.5 h-4.5" />
                      <span>Resolution Report</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-medium italic">
                      "{selectedComplaint.resolutionNotes || 'No notes left by resolving officer.'}"
                    </p>
                    {selectedComplaint.resolutionImageUrl && (
                      <img 
                        src={selectedComplaint.resolutionImageUrl} 
                        alt="Resolution proof" 
                        className="w-full h-32 rounded-lg object-cover border border-emerald-500/20 shadow-sm"
                      />
                    )}

                    {/* Feedback Form */}
                    <div className="pt-3 border-t border-emerald-500/20 space-y-3">
                      <span className="font-semibold text-slate-200 block text-xs">Rate the resolution & close case:</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 hover:scale-110 active:scale-95 transition-all focus:outline-none"
                          >
                            <Star
                              className={`w-5.5 h-5.5 transition-all ${star <= rating ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]' : 'text-slate-650 hover:text-slate-500'}`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        placeholder="Write feedback notes (optional)..."
                        className="w-full p-2.5 rounded-lg text-xs text-slate-200 bg-slate-900 border border-slate-800 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all resize-none"
                      />
                      <button
                        onClick={() => handleFeedbackSubmit(selectedComplaint.id)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold rounded-lg text-xs transition-all shadow-lg shadow-emerald-600/10 text-center"
                      >
                        Submit Feedback & Close Case
                      </button>
                    </div>
                  </div>
                )}

                {selectedComplaint.status === 'CLOSED' && (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Your Rating</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${star <= selectedComplaint.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {selectedComplaint.feedbackNotes && (
                      <p className="text-slate-450 text-xs italic">"{selectedComplaint.feedbackNotes}"</p>
                    )}
                  </div>
                )}

                {/* Progress Timeline */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grievance Timeline</span>
                  <div className="relative pl-6 space-y-4 timeline-line">
                    {selectedComplaint.timeline?.map((event, idx) => (
                      <div key={event.id || idx} className="relative text-xs">
                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-blue-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-400 uppercase tracking-wider">{event.status}</span>
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
              <Info className="w-8 h-8 text-slate-650 mx-auto" />
              <p className="text-xs">Select a grievance from the list to view its real-time tracking timeline, SLA status, assigned officer, and to submit feedback ratings.</p>
            </div>
          )}
        </div>

      </div>

      {/* File Complaint Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-panel max-w-2xl w-full p-6 sm:p-8 rounded-2xl shadow-2xl relative space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="text-xl font-bold font-outfit text-white">File Public Grievance</h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 rounded bg-slate-900 border border-slate-850 hover:text-white text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiAnalyzing ? (
              // AI Processing Loader
              <div className="py-12 text-center space-y-6 animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto animate-spin">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-200">Grievix AI Analysing Complaint...</h4>
                  <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">
                    Reading description, evaluating coordinates, predicting urgency, classifying category, and assigning optimal department officer.
                  </p>
                </div>
              </div>
            ) : aiResult ? (
              // AI Analysis Success Panel
              <div className="space-y-6 text-left">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center space-x-3 text-emerald-450 text-xs">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>Your complaint has been successfully registered and routed by Artificial Intelligence!</span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">AI Routing Report</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-slate-500 font-medium">Estimated Urgency</span>
                      <span className="text-slate-250 font-bold block">{aiResult.priority}</span>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-slate-500 font-medium">Auto-Categorization</span>
                      <span className="text-slate-250 font-bold block">{aiResult.category?.replace('_', ' ')}</span>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-1 col-span-2">
                      <span className="text-slate-500 font-medium">Assigned Department</span>
                      <span className="text-slate-250 font-bold block">{aiResult.department?.replace('_', ' ')}</span>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-1 col-span-2">
                      <span className="text-slate-500 font-medium">Officer Assigned</span>
                      <span className="text-slate-250 font-bold block">{aiResult.officerName || 'Unassigned (Assigned to General Queue)'}</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 text-xs space-y-2">
                    <div>
                      <span className="text-blue-450 font-bold block">1-Sentence AI Summary</span>
                      <p className="text-slate-300 leading-relaxed italic mt-0.5">"{aiResult.description.substring(0, 100)}..."</p>
                    </div>
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-blue-450 font-bold block">SLA Resolution Target</span>
                      <p className="text-slate-300 mt-0.5">Complaint must be resolved by: <span className="font-semibold">{new Date(aiResult.slaDeadline).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setShowSubmitModal(false); setAiResult(null); }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors text-center"
                >
                  Done (Go to Dashboard)
                </button>
              </div>
            ) : (
              // Filing Form
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-450 font-semibold">Complaint Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Briefly describe the issue (e.g. Water leak near gate)"
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-450 font-semibold">Detailed Description</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the issue. Our AI will read this to categorize and route correctly..."
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  />
                </div>

                {/* Hotspot Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-450 font-semibold flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Location Hotspot</span>
                  </label>
                  <select
                    value={selectedHotspot}
                    onChange={(e) => handleHotspotChange(Number(e.target.value))}
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-sm appearance-none bg-slate-900"
                  >
                    {BENGALURU_HOTSPOTS.map((spot, index) => (
                      <option key={index} value={index}>
                        {spot.name} ({spot.ward})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Leaflet GPS Picker Map */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-450 font-semibold flex items-center justify-between">
                    <span>Pin Exact Location on Map</span>
                    <span className="text-[10px] text-slate-505 font-mono">
                      GPS: [{latitude.toFixed(4)}, {longitude.toFixed(4)}]
                    </span>
                  </label>
                  <div 
                    id="citizen-map" 
                    className="h-44 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden relative z-10"
                    style={{ minHeight: '176px' }}
                  ></div>
                </div>

                {/* Upload Image Section */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-450 font-semibold flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Attach Complaint Image (Real File Upload or Presets)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Binary File Upload Box */}
                    <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl flex flex-col justify-center items-center space-y-1.5 group hover:border-slate-700 transition-colors relative min-h-[70px]">
                      <input
                        type="file"
                        id="file-upload"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-1 text-slate-400 group-hover:text-slate-200">
                        <Upload className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[11px] font-semibold">
                          {isUploading ? 'Uploading file...' : 'Choose Image File'}
                        </span>
                        <span className="text-[9px] text-slate-550">PNG, JPG, JPEG</span>
                      </label>
                    </div>

                    {/* Presets Grid fallback */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-550 uppercase font-bold tracking-wider block mb-1">Or Choose Preset</span>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.keys(IMAGE_PRESETS).map((key) => (
                          <button
                            type="button"
                            key={key}
                            onClick={() => handlePresetImageChange(key)}
                            className={`p-1 rounded border text-[9px] text-center font-medium truncate transition-all ${imageCategory === key && imageUrl && !isCustomUpload ? 'bg-blue-600/10 border-blue-500 text-blue-450 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                          >
                            {key.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {imageUrl && (
                    <div className="mt-3 relative w-full h-28 rounded-xl overflow-hidden border border-slate-800">
                      <img src={imageUrl} alt="Complaint Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2.5 flex items-end justify-between">
                        <span className="text-[10px] font-bold text-slate-300">
                          {isCustomUpload ? 'Custom Uploaded Photo' : 'Preset Image Selected'}
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

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-3.5 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-all"
                >
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  <span>Submit with AI Analysis</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
