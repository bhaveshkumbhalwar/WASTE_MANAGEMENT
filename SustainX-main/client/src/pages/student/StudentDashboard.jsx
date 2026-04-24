import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { fmtDate, getInitials } from '../../utils/helpers';
import {
  getComplaints,
  getComplaintById as fetchComplaint,
  submitComplaint,
  getRewards,
  addReward,
  changePassword,
  getUserById,
  getStoreItems,
  redeemStoreItem,
  getOrders,
  updateUser,
} from '../../services/api';

const NAV_ITEMS = [
  { id: 'sec-profile', label: 'Profile', icon: '👤' },
  { id: 'sec-complaint', label: 'Complaint', icon: '📸' },
  { id: 'sec-history', label: 'History', icon: '📋' },
  { id: 'sec-status', label: 'Track Status', icon: '🔍' },
  { id: 'sec-scan', label: 'Quick Scan', icon: '📱' },
  { id: 'sec-reward', label: 'Rewards', icon: '🏆' },
  { id: 'sec-store', label: 'Store', icon: '🛒' },
  { id: 'sec-orders', label: 'My Orders', icon: '📦' },
  { id: 'sec-awareness', label: 'Awareness', icon: '🌱' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [section, setSection] = useState('sec-profile');

  // Profile data
  const [profile, setProfile] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);

  // Complaint form
  const [compLocation, setCompLocation] = useState('');
  const [compType, setCompType] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compBlock, setCompBlock] = useState('');
  const [compImage, setCompImage] = useState(null);
  const [compPreview, setCompPreview] = useState(null);

  // History
  const [complaints, setComplaints] = useState([]);
  const [histFilter, setHistFilter] = useState('');

  // Track
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackNotFound, setTrackNotFound] = useState(false);

  // Scan
  const [scanLocation, setScanLocation] = useState('');
  const [scanBlock, setScanBlock] = useState('');

  // Rewards
  const [rewards, setRewards] = useState([]);
  const [rewardTotal, setRewardTotal] = useState(0);

  // Password
  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  // Update Profile
  const [upName, setUpName] = useState('');

  // Carousel
  const [carouselIdx, setCarouselIdx] = useState(0);

  // Mobile navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Store
  const [storeItems, setStoreItems] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  // Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);


  const loadProfile = useCallback(async () => {
    try {
      const res = await getUserById(user._id);
      setProfile(res.data);
      setUpName(res.data.name || '');
      const compRes = await getComplaints({ user: user._id });
      setRecentComplaints(compRes.data.slice(0, 5));
    } catch { /* ignore */ }
  }, [user._id]);

  const loadHistory = useCallback(async () => {
    try {
      const params = { user: user._id };
      if (histFilter) params.status = histFilter;
      const res = await getComplaints(params);
      setComplaints(res.data);
    } catch { /* ignore */ }
  }, [user._id, histFilter]);

  const loadRewards = useCallback(async () => {
    try {
      const res = await getRewards({ user: user._id });
      setRewards(res.data);
      const profRes = await getUserById(user._id);
      setRewardTotal(profRes.data.rewardPoints || 0);
    } catch { /* ignore */ }
  }, [user._id]);

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadRewards();
    loadStore();
    loadOrders();
  }, [loadProfile, loadHistory, loadRewards]);

  // Carousel auto-rotate
  const slides = 5;
  useEffect(() => {
    const timer = setInterval(() => setCarouselIdx((i) => (i + 1) % slides), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadStore = async () => {
    try {
      const res = await getStoreItems();
      setStoreItems(res.data);
    } catch { /* ignore */ }
  };

  const loadOrders = async () => {
    try {
      setIsOrdersLoading(true);
      const res = await getOrders();
      setMyOrders(res.data);
    } catch { /* ignore */ } finally {
      setIsOrdersLoading(false);
    }
  };

  const [isRedeeming, setIsRedeeming] = useState(false);
  const handleRedeem = async (itemId) => {
    if (isRedeeming) return;
    setIsRedeeming(true);
    try {
      console.log("REDEEM REQUEST for:", itemId);
      const res = await redeemStoreItem(itemId);
      showToast(`Item redeemed! Order ${res.data.order.orderId} created. Remaining: ${res.data.remainingPoints} pts ✅`);
      await Promise.all([loadStore(), loadOrders(), loadProfile(), loadRewards()]);
    } catch (err) {
      console.error("REDEEM ERROR:", err);
      showToast(err.response?.data?.message || 'Error redeeming item', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setCompImage(null); setCompPreview(null); return; }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB.', 'warning');
      e.target.value = '';
      return;
    }
    setCompImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setCompPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleComplaint = async (e) => {
    e.preventDefault();
    if (!compLocation || !compType || !compDesc || !compBlock) {
      showToast('Please fill all fields including Block.', 'warning');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('location', compLocation);
      formData.append('wasteType', compType);
      formData.append('description', compDesc);
      formData.append('block', compBlock);
      if (compImage) formData.append('image', compImage);

      const res = await submitComplaint(formData);
      showToast(`Complaint ${res.data.complaintId} submitted! ✅`);
      setCompLocation(''); setCompType(''); setCompDesc(''); setCompBlock('');
      setCompImage(null); setCompPreview(null);
      loadProfile(); loadHistory();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error submitting', 'error');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanLocation || !scanBlock) { showToast('Please enter location and select block.', 'warning'); return; }
    try {
      const formData = new FormData();
      formData.append('location', scanLocation);
      formData.append('wasteType', 'Dustbin Overflow');
      formData.append('description', 'Dustbin full alert via Quick Scan.');
      formData.append('type', 'scan');
      formData.append('block', scanBlock);

      const res = await submitComplaint(formData);
      await addReward({ user: user._id, activity: 'Dustbin Full Alert (Scan)', points: 30 });
      showToast(`Alert sent! ${res.data.complaintId} — +30 pts earned 🏆`, 'success');
      setScanLocation(''); setScanBlock('');
      loadProfile(); loadRewards();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleTrack = async () => {
    setTrackResult(null); setTrackNotFound(false);
    if (!trackInput.trim()) return;
    try {
      const res = await fetchComplaint(trackInput.trim().toUpperCase());
      setTrackResult(res.data);
    } catch {
      setTrackNotFound(true);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!cpOld || !cpNew || !cpConfirm) { showToast('Please fill all fields.', 'error'); return; }
    if (cpNew !== cpConfirm) { showToast('New passwords do not match.', 'error'); return; }
    if (cpNew.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return; }
    try {
      await changePassword(user._id, { oldPassword: cpOld, newPassword: cpNew });
      showToast('Password updated successfully! ✅');
      setCpOld(''); setCpNew(''); setCpConfirm('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!upName.trim()) { showToast('Name cannot be empty.', 'error'); return; }
    try {
      await updateUser(user._id, { name: upName.trim() });
      showToast('Profile updated successfully! ✅');
      loadProfile(); // reload profile to show new name
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating profile', 'error');
    }
  };

  const handleViewComplaint = async (id) => {
    try {
      const res = await fetchComplaint(id);
      setSelectedDetail(res.data);
      setDetailModalOpen(true);
    } catch (err) {
      console.error("Error fetching complaint:", err);
      showToast('Error loading complaint details', 'error');
    }
  };

  const currentLabel = NAV_ITEMS.find((n) => n.id === section)?.label || '';

  return (
    <div className="app-layout">
      <Sidebar
        portalName="Student Portal"
        icon="♻️"
        navItems={NAV_ITEMS}
        activeSection={section}
        onNavigate={setSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="main-content">
        <Topbar title={currentLabel} onToggleMenu={() => setIsSidebarOpen(true)} />
        <div className="page-content">

          {/* ── PROFILE ── */}
          {section === 'sec-profile' && (
            <section className="page-section active" id="sec-profile">
              <div className="profile-header">
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar">{getInitials(profile?.name)}</div>
                </div>
                <div className="profile-info">
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clr-navy)' }}>{profile?.name || user?.name || 'SustainX User'}</h3>
                  <p style={{ marginBottom: '.4rem', color: 'var(--txt-muted)' }}>{profile?.email || user?.email}</p>
                  <div className="profile-meta">
                    <span className="profile-meta-tag">📚 {profile?.dept || 'General'}</span>
                    <span className="profile-meta-tag">📋 {recentComplaints.length} Complaints</span>
                    <span className="profile-meta-tag">🏆 {profile?.rewardPoints || 0} pts</span>
                  </div>
                </div>
              </div>
              <div className="grid-2" style={{ gap: '1.5rem' }}>
                <div className="card">
                  <div className="section-title"><div className="section-title-bar"></div><h2>Recent Complaints</h2></div>
                  {recentComplaints.length === 0 ? (
                    <p className="text-muted">No complaints yet.</p>
                  ) : (
                    recentComplaints.map((c) => (
                      <div className="reward-item" key={c.complaintId}>
                        <div className="reward-icon">📋</div>
                        <div>
                          <div style={{ fontSize: '.87rem', fontWeight: 600 }}>{c.complaintId}</div>
                          <div className="text-muted" style={{ fontSize: '.78rem' }}>{c.location}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}><StatusBadge status={c.status} /></div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="card">
                    <div className="section-title"><div className="section-title-bar"></div><h2>Update Profile</h2></div>
                    <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                      <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" value={upName} onChange={(e) => setUpName(e.target.value)} placeholder="Your Name" /></div>
                      <button type="submit" className="btn btn-primary">✏️ Update Name</button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="section-title"><div className="section-title-bar"></div><h2>Change Password</h2></div>
                    <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                      <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={cpOld} onChange={(e) => setCpOld(e.target.value)} placeholder="Current password" /></div>
                      <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} placeholder="New password" /></div>
                      <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Repeat new password" /></div>
                      <button type="submit" className="btn btn-primary">🔐 Update Password</button>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── FILE COMPLAINT ── */}
          {section === 'sec-complaint' && (
            <section className="page-section active" id="sec-complaint">
              <div className="section-title"><div className="section-title-bar"></div><h2>📸 File a Complaint</h2></div>
              <div className="card" style={{ maxWidth: 680 }}>
                <form onSubmit={handleComplaint} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input className="form-input" type="text" placeholder="e.g. Block A Ground Floor" value={compLocation} onChange={(e) => setCompLocation(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Block</label>
                      <select className="form-select" value={compBlock} onChange={(e) => setCompBlock(e.target.value)}>
                        <option value="">Select Block…</option>
                        <option value="A">Block A</option>
                        <option value="B">Block B</option>
                        <option value="C">Block C</option>
                        <option value="D">Block D</option>
                        <option value="E">Block E</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Waste Type</label>
                      <select className="form-select" value={compType} onChange={(e) => setCompType(e.target.value)}>
                        <option value="">Select type…</option>
                        <option>Mixed Waste</option>
                        <option>Food Waste</option>
                        <option>Paper Waste</option>
                        <option>Plastic Waste</option>
                        <option>Electronic Waste</option>
                        <option>Hazardous Waste</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" placeholder="Describe the waste situation…" value={compDesc} onChange={(e) => setCompDesc(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attach Image (optional)</label>
                    <div className="upload-zone" onClick={() => document.getElementById('complaint-image-input').click()}>
                      {compPreview ? (
                        <div className="upload-preview">
                          <img src={compPreview} alt="Preview" />
                          <button type="button" className="upload-remove" onClick={(e) => { e.stopPropagation(); setCompImage(null); setCompPreview(null); document.getElementById('complaint-image-input').value = ''; }}>✕</button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload image</span>
                          <span className="text-muted" style={{ fontSize: '.75rem' }}>JPG, PNG, WEBP — max 2 MB</span>
                        </div>
                      )}
                      <input id="complaint-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg">📤 Submit Complaint</button>
                </form>
              </div>
            </section>
          )}

          {/* ── HISTORY ── */}
          {section === 'sec-history' && (
            <section className="page-section active" id="sec-history">
              <div className="flex-between mb-3">
                <div className="section-title" style={{ margin: 0 }}><div className="section-title-bar"></div><h2>Complaint History</h2></div>
                <select className="form-select" style={{ width: 160 }} value={histFilter} onChange={(e) => setHistFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Location</th><th>Waste Type</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {complaints.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No complaints found.</td></tr>
                    ) : complaints.map((c) => (
                      <tr key={c.complaintId}>
                        <td><span onClick={() => handleViewComplaint(c.complaintId)} style={{ fontWeight: 700, color: '#4ade80', cursor: 'pointer' }}>{c.complaintId}</span></td>
                        <td>{c.location}</td>
                        <td>{c.wasteType}</td>
                        <td>{fmtDate(c.createdAt)}</td>
                        <td><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── TRACK STATUS ── */}
          {section === 'sec-status' && (
            <section className="page-section active" id="sec-status">
              <div className="section-title"><div className="section-title-bar"></div><h2>🔍 Track Complaint</h2></div>
              <div className="card" style={{ maxWidth: 500, marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '.7rem' }}>
                  <input className="form-input" placeholder="Enter Complaint ID (e.g. WMS-0001)" value={trackInput} onChange={(e) => setTrackInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTrack()} />
                  <button className="btn btn-blue" onClick={handleTrack}>Search</button>
                </div>
              </div>
              {trackResult && (
                <div className="card" style={{ maxWidth: 500 }}>
                  <div className="flex-between mb-2">
                    <h3 style={{ fontFamily: 'var(--font-heading)' }}>{trackResult.complaintId}</h3>
                    <StatusBadge status={trackResult.status} />
                  </div>
                  <p style={{ marginBottom: '1.2rem', fontSize: '.88rem' }}>
                    <strong>Location:</strong> {trackResult.location} &nbsp;·&nbsp;
                    <strong>Date:</strong> {fmtDate(trackResult.createdAt)}
                  </p>

                  {/* Rejection Reason Alert */}
                  {trackResult.status === 'rejected' && (
                    <div style={{ padding: '.8rem 1rem', borderRadius: '8px', background: 'rgba(235,76,76,.08)', border: '1px solid rgba(235,76,76,.2)', marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--clr-red)', textTransform: 'uppercase', marginBottom: '.3rem' }}>❌ Rejection Reason</div>
                      <div style={{ fontSize: '.88rem', color: 'var(--txt-primary)' }}>{trackResult.rejectionReason || 'No reason provided.'}</div>
                    </div>
                  )}

                  <div className="timeline">
                    {trackResult.status === 'completed' && trackResult.completionImage && (
                      <div style={{ marginBottom: '1.2rem', padding: '.8rem', borderRadius: '12px', background: 'rgba(145,208,108,.08)', border: '1px solid rgba(145,208,108,.2)' }}>
                        <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--clr-green)', textTransform: 'uppercase', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                          <span>✅ Completion Proof</span>
                        </div>
                        <img
                          src={trackResult.completionImage}
                          alt="Proof"
                          style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                      </div>
                    )}
                    {[
                      { label: 'Complaint Submitted', desc: `Filed on ${fmtDate(trackResult.createdAt)}`, done: true },
                      { label: 'Assigned to Collector', desc: 'Collector notified', done: trackResult.status !== 'pending' },
                      { 
                        label: trackResult.status === 'rejected' ? 'Rejected' : 'In Progress', 
                        desc: trackResult.status === 'rejected' ? 'Complaint was denied' : 'Collector working on it', 
                        done: trackResult.status === 'in-progress' || trackResult.status === 'completed' || trackResult.status === 'rejected',
                        isError: trackResult.status === 'rejected'
                      },
                      { 
                        label: 'Completed', 
                        desc: 'Area cleaned & verified', 
                        done: trackResult.status === 'completed',
                        hidden: trackResult.status === 'rejected'
                      },
                    ].filter(s => !s.hidden).map((s, i, arr) => (
                      <div className="timeline-item" key={i}>
                        <div className="timeline-line">
                          <div className={`timeline-dot ${s.done ? '' : 'inactive'} ${s.isError ? 'error' : ''}`}></div>
                          {i < arr.length - 1 && <div className="timeline-connector"></div>}
                        </div>
                        <div className="timeline-content">
                          <h4 style={{ color: s.isError ? 'var(--clr-red)' : (s.done ? 'var(--txt-primary)' : 'var(--txt-muted)') }}>{s.label}</h4>
                          <p>{s.done ? s.desc : 'Pending…'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trackNotFound && (
                <div className="card" style={{ maxWidth: 500 }}>
                  <p className="text-muted">❌ Complaint not found. Check the ID and try again.</p>
                </div>
              )}
            </section>
          )}

          {/* ── QUICK SCAN ── */}
          {section === 'sec-scan' && (
            <section className="page-section active" id="sec-scan">
              <div className="section-title"><div className="section-title-bar"></div><h2>📱 Quick Dustbin Scan</h2></div>
              <div className="scan-hero mb-3">
                <div className="scan-icon">🗑️</div>
                <h3>Dustbin Full Alert</h3>
                <p>Report an overflowing dustbin directly.<br />You'll earn reward points for each scan!</p>
              </div>
              <div className="card" style={{ maxWidth: 600 }}>
                <form onSubmit={handleScan} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dustbin Location</label>
                    <input className="form-input" type="text" placeholder="e.g. Canteen Entrance Gate 3" value={scanLocation} onChange={(e) => setScanLocation(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Block</label>
                    <select className="form-select" value={scanBlock} onChange={(e) => setScanBlock(e.target.value)}>
                      <option value="">Select Block…</option>
                      <option value="A">Block A</option>
                      <option value="B">Block B</option>
                      <option value="C">Block C</option>
                      <option value="D">Block D</option>
                      <option value="E">Block E</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-amber btn-lg">🚨 Send Dustbin Alert</button>
                </form>
              </div>
            </section>
          )}

          {/* ── REWARDS ── */}
          {section === 'sec-reward' && (
            <section className="page-section active" id="sec-reward">
              <div className="section-title"><div className="section-title-bar"></div><h2>🏆 My Rewards</h2></div>
              <div className="stat-grid mb-3">
                <StatCard icon="⭐" value={rewardTotal} label="Total Points" />
                <StatCard icon="📸" value={rewards.length} label="Reward Activities" />
              </div>
              <div className="card">
                <div className="section-title"><div className="section-title-bar"></div><h3>Reward History</h3></div>
                {rewards.length === 0 ? (
                  <p className="text-muted">No rewards yet. Submit complaints to earn points!</p>
                ) : rewards.map((r, i) => (
                  <div className="reward-item" key={i}>
                    <div className="reward-icon">🏆</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{r.activity}</div>
                      <div className="text-muted" style={{ fontSize: '.78rem' }}>{fmtDate(r.date)}</div>
                    </div>
                    <div className="reward-pts">+{r.points} pts</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── AWARENESS ── */}
          {section === 'sec-awareness' && (
            <section className="page-section active" id="sec-awareness">
              <div className="section-title"><div className="section-title-bar"></div><h2>🌱 Waste Awareness</h2></div>
              <div className="carousel">
                <button className="carousel-btn carousel-prev" onClick={() => setCarouselIdx((i) => (i - 1 + slides) % slides)}>‹</button>
                <button className="carousel-btn carousel-next" onClick={() => setCarouselIdx((i) => (i + 1) % slides)}>›</button>
                <div className="carousel-track" style={{ transform: `translateX(-${carouselIdx * 100}%)` }}>
                  {[
                    { icon: '♻️', title: 'Reduce, Reuse, Recycle', text: 'The 3Rs are the foundation of sustainable waste management.', badge: 'SDG Goal 12', bg: 'rgba(145,208,108,.15),rgba(64,150,40,.08)', cls: 'badge-done' },
                    { icon: '🌊', title: 'Plastic Pollution Crisis', text: 'Over 8 million tonnes of plastic enter our oceans each year.', badge: 'SDG Goal 14', bg: 'rgba(76,140,228,.12),rgba(64,96,147,.08)', cls: 'badge-progress' },
                    { icon: '🍎', title: 'Food Waste Matters', text: 'Approximately 1/3 of all food produced globally is wasted.', badge: 'SDG Goal 2', bg: 'rgba(255,215,80,.15),rgba(255,163,0,.08)', cls: 'badge-pending' },
                    { icon: '⚡', title: 'E-Waste Responsibility', text: 'Electronic waste contains hazardous materials like lead and mercury.', badge: 'Hazardous', bg: 'rgba(235,76,76,.1),rgba(180,40,40,.06)', cls: 'badge-red' },
                    { icon: '🏆', title: 'Earn Rewards for Clean Campus', text: 'Every complaint and dustbin alert earns you reward points.', badge: 'Campus Initiative', bg: 'rgba(145,208,108,.18),rgba(76,140,228,.1)', cls: 'badge-done' },
                  ].map((s, i) => (
                    <div className="carousel-slide" key={i}>
                      <div className="awareness-slide" style={{ background: `linear-gradient(135deg,${s.bg})` }}>
                        <div className="awareness-icon">{s.icon}</div>
                        <h3>{s.title}</h3>
                        <p>{s.text}</p>
                        <span className={`badge ${s.cls}`}>{s.badge}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="carousel-dots" style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '1rem' }}>
                {Array.from({ length: slides }).map((_, i) => (
                  <button key={i} className={`carousel-dot ${carouselIdx === i ? 'active' : ''}`} onClick={() => setCarouselIdx(i)} />
                ))}
              </div>
            </section>
          )}

          {/* ── STORE ── */}
          {section === 'sec-store' && (
            <section className="page-section active" id="sec-store">
              <div className="section-title"><div className="section-title-bar"></div><h2>🛒 Eco Store</h2></div>
              <p style={{ marginBottom: '1.2rem', color: 'var(--txt-muted)', fontSize: '.9rem' }}>
                Redeem your reward points for items made from recycled waste! You have <strong style={{ color: 'var(--clr-green)' }}>{rewardTotal} pts</strong>.
              </p>
              <div className="store-grid">
                {storeItems.length === 0 ? (
                  <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '.7rem' }}>🏪</div>
                    <h3>Store is empty</h3>
                    <p className="text-muted">No items available yet. Check back soon!</p>
                  </div>
                ) : storeItems.map((item) => (
                  <div className="store-card" key={item._id}>
                    <div className="card-image">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        onError={(e) => { e.target.src = "https://via.placeholder.com/200"; }}
                      />
                      <span className="store-eco-badge">♻️ Eco-friendly</span>
                    </div>
                    <div className="store-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.35rem' }}>
                        <div className="store-card-name" style={{ marginBottom: 0 }}>{item.name}</div>
                      </div>
                      <span className="store-category-tag">{item.category || 'other'}</span>
                      <div className="store-card-desc">{item.description}</div>
                      <div className="store-card-footer">
                        <div className="store-card-points">⭐ {item.pointsRequired} pts</div>
                        <span className="text-muted" style={{ fontSize: '.75rem' }}>{item.stock > 0 ? `${item.stock} left` : 'Out of stock'}</span>
                      </div>
                      <button
                        className={`btn btn-sm btn-full ${rewardTotal >= item.pointsRequired && item.stock > 0 ? 'btn-primary' : 'btn-ghost'}`}
                        disabled={rewardTotal < item.pointsRequired || item.stock <= 0 || isRedeeming}
                        onClick={() => handleRedeem(item._id)}
                        style={{ marginTop: '.6rem' }}
                      >
                        {isRedeeming ? '⌛ Redeeming…' : rewardTotal >= item.pointsRequired ? '🛒 Redeem' : `🔒 Need ${item.pointsRequired - rewardTotal} more pts`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── MY ORDERS ── */}
          {section === 'sec-orders' && (
            <section className="page-section active" id="sec-orders">
              <div className="section-title"><div className="section-title-bar"></div><h2>📦 My Orders & Redemptions</h2></div>
              <div className="stat-grid mb-3">
                <StatCard icon="📦" value={myOrders.length} label="Total Orders" />
                <StatCard icon="⏳" value={myOrders.filter(o => o.status === 'pending').length} label="Pending" />
                <StatCard icon="🎁" value={myOrders.filter(o => o.status === 'ready_for_pickup').length} label="Ready for Pickup" />
              </div>

              <div className="order-list-vertical">
                {isOrdersLoading ? (
                  [1, 2].map(i => (
                    <div className="card" key={i} style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                      <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
                      <div className="skeleton skeleton-rect" style={{ margin: '1.5rem 0' }}></div>
                      <div className="grid-2">
                        <div className="skeleton skeleton-text"></div>
                        <div className="skeleton skeleton-text"></div>
                      </div>
                    </div>
                  ))
                ) : myOrders.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem' }}>🛍️</div>
                    <h3>No orders found</h3>
                    <p className="text-muted">Redeem your points in the Eco Store to see your orders here!</p>
                  </div>
                ) : myOrders.map((o) => (
                  <div className="card order-tracking-card card-lift" key={o._id} style={{ marginBottom: '1.2rem', padding: '1.5rem' }}>
                    <div className="order-tracking-header" style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem' }}>📦</div>
                        <div>
                          <div className="order-id-label">Order <span style={{ color: 'var(--clr-blue)' }}>{o.orderId}</span></div>
                          <div className="order-date-label">Placed on {fmtDate(o.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="order-points-badge" style={{ fontSize: '.9rem', padding: '.4rem .8rem' }}>⭐ {o.pointsUsed} pts</div>
                        {(o.failedAttempts || 0) > 0 && (
                          <div style={{ fontSize: '.65rem', color: 'var(--clr-red)', fontWeight: 700, marginTop: '.3rem' }}>
                            ⚠️ {3 - o.failedAttempts} attempts left
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="order-details-grid">
                      {/* Product & Location */}
                      <div>
                        <div style={{ marginBottom: '.8rem' }}>
                          <div className="info-label">Product</div>
                          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--clr-navy)' }}>{o.itemName}</div>
                        </div>
                        {o.assignedCollectorName && (
                          <div style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--clr-green)', fontWeight: 600, fontSize: '.85rem' }}>
                            <span>👷 Collector:</span>
                            <span>{o.assignedCollectorName}</span>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <div className="info-label">📍 Location</div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{o.pickupLocation || 'Admin Office'}</div>
                          </div>
                          <div>
                            <div className="info-label">🕒 Time</div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{o.pickupTime || '10 AM - 5 PM'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Pickup Code & QR */}
                      <div style={{ background: 'var(--bg-muted, rgba(0,0,0,.02))', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div className="info-label">🔐 Pickup Code</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', margin: '.3rem 0' }}>
                          <div className="pickup-code" style={{ letterSpacing: '2px', fontSize: '1.2rem' }}>{o.pickupCode}</div>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: '.2rem .4rem' }}
                            onClick={() => {
                              navigator.clipboard.writeText(o.pickupCode);
                              showToast('Code copied!', 'info');
                            }}
                          >
                            📋
                          </button>
                        </div>
                        <div className="qr-container" style={{ margin: '.5rem 0', padding: '.5rem', background: 'white' }}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${o.pickupCode}`} 
                            alt="QR"
                            style={{ width: '80px', height: '80px' }}
                          />
                        </div>
                        <div style={{ fontSize: '.65rem', color: 'var(--txt-muted)' }}>
                          {o.expiresAt ? `Expires: ${new Date(o.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Show this at pickup'}
                        </div>
                      </div>

                      {/* Status Simple Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div className="info-label">Status</div>
                        <StatusBadge status={o.status === 'ready_for_pickup' ? 'ready' : o.status === 'approved' ? 'in-progress' : o.status === 'delivered' ? 'completed' : 'pending'} />
                        {o.status === 'delivered' && o.deliveredAt && (
                          <div style={{ fontSize: '.7rem', color: 'var(--clr-green)', marginTop: '.5rem', fontWeight: 600 }}>
                            Delivered {fmtDate(o.deliveredAt)}
                          </div>
                        )}
                        {o.failedAttempts >= 3 && (
                          <div style={{ fontSize: '.7rem', color: 'var(--clr-red)', marginTop: '.5rem', fontWeight: 700 }}>
                            ⛔ ACCOUNT LOCKED
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracker */}
                    <div className="order-status-tracker" style={{ margin: '1rem 0 2rem' }}>
                      {['pending', 'approved', 'ready_for_pickup', 'delivered'].map((s, i) => {
                        const statusOrder = ['pending', 'approved', 'ready_for_pickup', 'delivered'];
                        const currentIdx = statusOrder.indexOf(o.status);
                        const isCompleted = i < currentIdx || o.status === 'delivered';
                        const isActive = o.status === s;
                        return (
                          <div key={s} className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            <div className="step-dot">{isCompleted ? '✓' : i + 1}</div>
                            <div className="step-text">{s.replace(/_/g, ' ')}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.8rem' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setReceiptOrder(o); setReceiptModalOpen(true); }}>🧾 Full Receipt</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}


        </div>

        {/* ── RECEIPT MODAL ── */}
        <Modal id="receipt-modal" isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="🧾 Order Receipt">
          {receiptOrder && (
            <div className="receipt-container">
              <div className="receipt-header">
                <div className="receipt-logo">♻️ SustainX</div>
                <div className="receipt-subtitle">Eco Store — Order Receipt</div>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-body">
                <div className="receipt-row">
                  <span className="receipt-label">📋 Order ID</span>
                  <span className="receipt-value">{receiptOrder.orderId}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">📦 Product</span>
                  <span className="receipt-value" style={{ fontWeight: 700 }}>{receiptOrder.itemName}</span>
                </div>
                  <div className="receipt-row">
                    <span className="receipt-label">⭐ Points Used</span>
                    <span className="receipt-value">{receiptOrder.pointsUsed} pts</span>
                  </div>
                <div className="receipt-row">
                  <span className="receipt-label">📅 Date</span>
                  <span className="receipt-value">{fmtDate(receiptOrder.createdAt)}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">📍 Pickup Location</span>
                  <span className="receipt-value">{receiptOrder.pickupLocation || 'Admin Office / College Store Room'}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">🕒 Pickup Time</span>
                  <span className="receipt-value">{receiptOrder.pickupTime || '10 AM – 5 PM'}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">📌 Status</span>
                  <span className="receipt-value" style={{ textTransform: 'capitalize' }}>{receiptOrder.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="receipt-divider"></div>

              {receiptOrder.pickupCode && (
                <div className="receipt-code-section">
                  <div className="receipt-label" style={{ textAlign: 'center', marginBottom: '.3rem' }}>🔐 Pickup Code</div>
                  <div className="receipt-pickup-code">{receiptOrder.pickupCode}</div>
                  <div className="text-muted" style={{ textAlign: 'center', fontSize: '.7rem', marginTop: '.3rem' }}>Present this code at the pickup counter</div>
                </div>
              )}

              <div className="receipt-divider"></div>

              <div className="receipt-footer">
                <p>Thank you for choosing eco-friendly products! 🌱</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-primary btn-full" onClick={() => window.print()}>🖨️ Print Receipt</button>
                  <button className="btn btn-ghost btn-full" onClick={() => setReceiptModalOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </Modal>
        
        {/* ── COMPLAINT DETAIL MODAL ── */}
        <Modal id="detail-modal" isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="📋 Complaint Details">
          {selectedDetail && (
            <div className="complaint-detail-container" style={{ padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--clr-blue)' }}>{selectedDetail.complaintId}</h2>
                <StatusBadge status={selectedDetail.status} />
              </div>

              <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Location</div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--txt-primary)' }}>{selectedDetail.location}</p>
                </div>
                <div>
                  <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Waste Type</div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--txt-primary)' }}>{selectedDetail.wasteType}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Description</div>
                  <p style={{ margin: 0, color: 'var(--txt-primary)', lineHeight: 1.5 }}>{selectedDetail.description}</p>
                </div>
                <div>
                  <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Submitted On</div>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>{new Date(selectedDetail.createdAt).toLocaleString()}</p>
                </div>
                {selectedDetail.assignedTo && (
                  <div>
                    <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Assigned Collector</div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--clr-green)' }}>{selectedDetail.assignedTo.name}</p>
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                {selectedDetail.image && (
                  <div>
                    <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginBottom: '0.4rem' }}>Initial Photo</div>
                    <img src={selectedDetail.image} alt="Complaint" style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)', objectFit: 'cover', height: '180px' }} />
                  </div>
                )}
                {selectedDetail.completionImage && (
                  <div>
                    <div className="form-label" style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginBottom: '0.4rem' }}>Completion Proof</div>
                    <img src={selectedDetail.completionImage} alt="Completed" style={{ width: '100%', borderRadius: '12px', border: '2px solid var(--clr-green)', objectFit: 'cover', height: '180px' }} />
                  </div>
                )}
              </div>

              {/* Status History */}
              <div style={{ background: 'var(--bg-sidebar)', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-green)' }}>Timeline & History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {selectedDetail.statusHistory.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: '95px' }}><StatusBadge status={h.status} /></div>
                      <div style={{ color: 'var(--txt-primary)', paddingTop: '2px' }}>{h.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={() => setDetailModalOpen(false)}>Close Details</button>
            </div>
          )}
        </Modal>


      </main>
    </div>
  );
}
