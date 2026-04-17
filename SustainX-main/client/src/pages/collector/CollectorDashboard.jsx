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
  updateComplaintStatus,
  getDashboardStats,
  changePassword,
  getUserById,
} from '../../services/api';

const NAV_ITEMS = [
  { id: 'sec-dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'sec-history', label: 'History', icon: '✅' },
  { id: 'sec-awareness', label: 'Awareness', icon: '🌱' },
  { id: 'sec-profile', label: 'Profile', icon: '👤' },
];

export default function CollectorDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [section, setSection] = useState('sec-dashboard');

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, progress: 0, done: 0 });

  // Complaints
  const [openComplaints, setOpenComplaints] = useState([]);
  const [dashFilter, setDashFilter] = useState('');
  const [resolved, setResolved] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [modalStatus, setModalStatus] = useState('in-progress');

  // Profile
  const [profile, setProfile] = useState(null);
  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await getComplaints();
      let open = res.data.filter((c) => c.status !== 'completed');
      if (dashFilter) open = open.filter((c) => c.status === dashFilter);
      setOpenComplaints(open);
    } catch { /* ignore */ }
  }, [dashFilter]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getComplaints({ status: 'completed' });
      setResolved(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getUserById(user.userId);
      setProfile(res.data);
    } catch { /* ignore */ }
  }, [user.userId]);

  useEffect(() => {
    loadStats();
    loadDashboard();
    loadHistory();
    loadProfile();
  }, [loadStats, loadDashboard, loadHistory, loadProfile]);

  // Polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
      loadDashboard();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadStats, loadDashboard]);

  const handleUpdateStatus = async () => {
    try {
      await updateComplaintStatus(activeId, { status: modalStatus, note: `Status updated to ${modalStatus}` });
      showToast(`Complaint ${activeId} marked as "${modalStatus}" ✅`);
      setModalOpen(false);
      loadDashboard();
      loadHistory();
      loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!cpOld || !cpNew || !cpConfirm) { showToast('Please fill all fields.', 'error'); return; }
    if (cpNew !== cpConfirm) { showToast('Passwords do not match.', 'error'); return; }
    if (cpNew.length < 6) { showToast('Password must be ≥ 6 characters.', 'warning'); return; }
    try {
      await changePassword(user.userId, { oldPassword: cpOld, newPassword: cpNew });
      showToast('Password updated! ✅');
      setCpOld(''); setCpNew(''); setCpConfirm('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const currentLabel = NAV_ITEMS.find((n) => n.id === section)?.label || '';

  const filterTabs = [
    { label: 'All Open', filter: '' },
    { label: '⏳ Pending', filter: 'pending' },
    { label: '🔄 In Progress', filter: 'in-progress' },
  ];

  return (
    <div className="app-layout">
      <Sidebar portalName="Collector Portal" icon="🚛" navItems={NAV_ITEMS} activeSection={section} onNavigate={setSection} />
      <main className="main-content">
        <Topbar title={currentLabel} />
        <div className="page-content">

          {/* ── DASHBOARD ── */}
          {section === 'sec-dashboard' && (
            <section className="page-section active">
              <div className="stat-grid mb-3">
                <StatCard icon="📋" value={stats.total} label="Total Complaints" />
                <StatCard icon="⏳" value={stats.pending} label="Pending" />
                <StatCard icon="🔄" value={stats.progress} label="In Progress" />
                <StatCard icon="✅" value={stats.done} label="Completed" />
              </div>

              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                {filterTabs.map((t) => (
                  <button
                    key={t.filter}
                    className={`btn btn-sm ${dashFilter === t.filter ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setDashFilter(t.filter)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid-3" style={{ gap: '1rem' }}>
                {openComplaints.length === 0 ? (
                  <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '.7rem' }}>🎉</div>
                    <h3>All Clear!</h3>
                    <p className="text-muted">No open complaints. Great work!</p>
                  </div>
                ) : openComplaints.map((c) => (
                  <div className="complaint-card" key={c.complaintId}>
                    <div className="complaint-img">🗑️</div>
                    <div className="complaint-body">
                      <div className="complaint-id">{c.complaintId}</div>
                      <div className="complaint-location">📍 {c.location}</div>
                      <div className="complaint-desc">{c.description}</div>
                      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                        <StatusBadge status={c.status} />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setActiveId(c.complaintId); setModalStatus('in-progress'); setModalOpen(true); }}
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── HISTORY ── */}
          {section === 'sec-history' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>✅ Resolved Complaints</h2></div>
              <div className="stat-grid mb-3">
                <StatCard icon="🏅" value={resolved.length} label="Total Resolved" />
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Location</th><th>Waste Type</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {resolved.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No resolved complaints yet.</td></tr>
                    ) : resolved.map((c) => (
                      <tr key={c.complaintId}>
                        <td><span style={{ fontWeight: 700, color: 'var(--clr-green)' }}>{c.complaintId}</span></td>
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

          {/* ── AWARENESS ── */}
          {section === 'sec-awareness' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🌱 Waste Management Importance</h2></div>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
                {[
                  { icon: '🌍', title: 'Environmental Impact', text: 'Proper waste collection prevents soil and water contamination.', color: 'var(--clr-green)' },
                  { icon: '🏥', title: 'Public Health Protection', text: 'Unmanaged waste attracts pests and spreads diseases.', color: 'var(--clr-blue)' },
                  { icon: '📊', title: 'SDG Contribution', text: 'Your work directly contributes to UN Sustainable Development Goals.', color: 'var(--clr-amber)' },
                  { icon: '⚠️', title: 'Safety First', text: 'Always wear protective gloves and masks when handling waste.', color: 'var(--clr-red)' },
                  { icon: '🔄', title: 'Segregation Matters', text: 'Separate wet, dry, and hazardous waste at the point of collection.', color: 'var(--clr-navy)' },
                  { icon: '🏆', title: 'Your Impact Matters', text: 'Every complaint you resolve is a cleaner, safer campus.', color: 'var(--clr-green)' },
                ].map((c, i) => (
                  <div className="card card-lift" key={i} style={{ borderTop: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '.7rem' }}>{c.icon}</div>
                    <h3 style={{ marginBottom: '.5rem' }}>{c.title}</h3>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── PROFILE ── */}
          {section === 'sec-profile' && (
            <section className="page-section active">
              <div className="profile-header">
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar">{getInitials(profile?.name)}</div>
                </div>
                <div className="profile-info">
                  <h3>{profile?.name || '—'}</h3>
                  <p>{profile?.email}</p>
                  <div className="profile-meta">
                    <span className="profile-meta-tag">🚛 Collector</span>
                    <span className="profile-meta-tag">ID: {profile?.userId || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="card" style={{ maxWidth: 460 }}>
                <div className="section-title"><div className="section-title-bar"></div><h2>Change Password</h2></div>
                <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                  <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={cpOld} onChange={(e) => setCpOld(e.target.value)} placeholder="Current password" /></div>
                  <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} placeholder="New password" /></div>
                  <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Repeat new password" /></div>
                  <button type="submit" className="btn btn-primary">🔐 Update Password</button>
                </form>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Update Status Modal */}
      <Modal id="update-modal" isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Update Complaint Status">
        <p style={{ marginBottom: '1rem', fontSize: '.88rem', color: 'var(--txt-muted)' }}>
          ID: <strong>{activeId}</strong>
        </p>
        <div className="form-group mb-2">
          <label className="form-label">New Status</label>
          <select className="form-select" value={modalStatus} onChange={(e) => setModalStatus(e.target.value)}>
            <option value="in-progress">🔄 In Progress</option>
            <option value="completed">✅ Completed</option>
          </select>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleUpdateStatus}>Save Status</button>
      </Modal>
    </div>
  );
}
