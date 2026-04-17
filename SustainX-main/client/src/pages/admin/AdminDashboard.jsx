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
  getUsers,
  getUserById,
  createUser,
  deleteUserApi,
  getDashboardStats,
  getRewards,
  addReward,
  changePassword,
} from '../../services/api';

const NAV_ITEMS = [
  { id: 'sec-dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'sec-users', label: 'Manage Users', icon: '👥' },
  { id: 'sec-rewards', label: 'Give Rewards', icon: '🏆' },
  { id: 'sec-profile', label: 'Profile', icon: '🔐' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [section, setSection] = useState('sec-dashboard');

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, progress: 0, done: 0, students: 0, collectors: 0 });
  const [allComplaints, setAllComplaints] = useState([]);

  // Users
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewUserData, setViewUserData] = useState(null);
  const [viewUserComplaints, setViewUserComplaints] = useState([]);

  // Create user form
  const [cuId, setCuId] = useState('');
  const [cuRole, setCuRole] = useState('student');
  const [cuName, setCuName] = useState('');
  const [cuEmail, setCuEmail] = useState('');
  const [cuDept, setCuDept] = useState('');
  const [cuPass, setCuPass] = useState('');

  // Rewards
  const [students, setStudents] = useState([]);
  const [rewStudentId, setRewStudentId] = useState('');
  const [rewActivity, setRewActivity] = useState('Waste Photo Complaint');
  const [rewCustom, setRewCustom] = useState('');
  const [rewPoints, setRewPoints] = useState('');
  const [allRewards, setAllRewards] = useState([]);

  // Profile
  const [profile, setProfile] = useState(null);
  const [apOld, setApOld] = useState('');
  const [apNew, setApNew] = useState('');
  const [apConfirm, setApConfirm] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await getComplaints();
      setAllComplaints(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getUsers(userRoleFilter || undefined);
      setUsers(res.data.filter((u) => u.role !== 'admin'));
    } catch { /* ignore */ }
  }, [userRoleFilter]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await getUsers('student');
      setStudents(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadAllRewards = useCallback(async () => {
    try {
      const res = await getRewards();
      // enrich with user names
      const userRes = await getUsers();
      const userMap = {};
      userRes.data.forEach((u) => (userMap[u.userId] = u.name));
      setAllRewards(
        res.data.map((r) => ({ ...r, userName: userMap[r.studentId] || r.studentId }))
      );
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
    loadComplaints();
    loadUsers();
    loadStudents();
    loadAllRewards();
    loadProfile();
  }, [loadStats, loadComplaints, loadUsers, loadStudents, loadAllRewards, loadProfile]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!cuId || !cuName || !cuEmail || !cuPass) { showToast('Please fill all required fields.', 'warning'); return; }
    try {
      await createUser({ userId: cuId.toUpperCase(), role: cuRole, name: cuName, email: cuEmail, dept: cuDept, password: cuPass });
      showToast(`User ${cuName} created successfully! ✅`);
      setCreateModalOpen(false);
      setCuId(''); setCuRole('student'); setCuName(''); setCuEmail(''); setCuDept(''); setCuPass('');
      loadUsers();
      loadStats();
      loadStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}" (${userId})? This cannot be undone.`)) return;
    try {
      await deleteUserApi(userId);
      showToast(`User ${name} deleted.`, 'warning');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const res = await getUserById(userId);
      setViewUserData(res.data);
      const compRes = await getComplaints({ studentId: userId });
      setViewUserComplaints(compRes.data);
      setViewModalOpen(true);
    } catch { /* ignore */ }
  };

  const handleAwardReward = async (e) => {
    e.preventDefault();
    const activity = rewActivity === 'Custom' ? rewCustom.trim() : rewActivity;
    const pts = parseInt(rewPoints);
    if (!rewStudentId) { showToast('Please select a student.', 'warning'); return; }
    if (!activity) { showToast('Please specify an activity.', 'warning'); return; }
    if (!pts || pts < 1) { showToast('Please enter valid points (≥ 1).', 'warning'); return; }
    try {
      await addReward({ studentId: rewStudentId, activity, points: pts });
      const stu = students.find((s) => s.userId === rewStudentId);
      showToast(`Awarded ${pts} pts to ${stu?.name || rewStudentId} for "${activity}" ✅`, 'success');
      setRewStudentId(''); setRewActivity('Waste Photo Complaint'); setRewCustom(''); setRewPoints('');
      loadAllRewards();
      loadStudents();
      loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!apOld || !apNew || !apConfirm) { showToast('Please fill all fields.', 'error'); return; }
    if (apNew !== apConfirm) { showToast('Passwords do not match.', 'error'); return; }
    if (apNew.length < 6) { showToast('Password must be ≥ 6 characters.', 'warning'); return; }
    try {
      await changePassword(user.userId, { oldPassword: apOld, newPassword: apNew });
      showToast('Admin password updated! 🔐', 'success');
      setApOld(''); setApNew(''); setApConfirm('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const currentLabel = NAV_ITEMS.find((n) => n.id === section)?.label || '';

  return (
    <div className="app-layout">
      <Sidebar portalName="Admin Portal" icon="⚙️" navItems={NAV_ITEMS} activeSection={section} onNavigate={setSection} />
      <main className="main-content">
        <Topbar title={currentLabel} />
        <div className="page-content">

          {/* ── DASHBOARD ── */}
          {section === 'sec-dashboard' && (
            <section className="page-section active">
              <div className="stat-grid mb-3">
                <StatCard icon="📋" value={stats.total} label="Total Complaints" borderColor="var(--clr-blue)" />
                <StatCard icon="⏳" value={stats.pending} label="Pending" borderColor="var(--clr-amber)" />
                <StatCard icon="🔄" value={stats.progress} label="In Progress" borderColor="var(--clr-blue)" />
                <StatCard icon="✅" value={stats.done} label="Resolved" borderColor="var(--clr-green)" />
                <StatCard icon="🎓" value={stats.students} label="Students" borderColor="var(--clr-navy)" />
                <StatCard icon="🚛" value={stats.collectors} label="Collectors" borderColor="var(--clr-green)" />
              </div>
              <div className="card">
                <div className="section-title"><div className="section-title-bar"></div><h2>All Complaints</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Student</th><th>Location</th><th>Type</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {allComplaints.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No complaints yet.</td></tr>
                      ) : allComplaints.map((c) => (
                        <tr key={c.complaintId}>
                          <td><strong style={{ color: 'var(--clr-blue)' }}>{c.complaintId}</strong></td>
                          <td>{c.studentId}</td>
                          <td>{c.location}</td>
                          <td><span style={{ fontSize: '.8rem' }}>{c.wasteType}</span></td>
                          <td>{fmtDate(c.createdAt)}</td>
                          <td><StatusBadge status={c.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── MANAGE USERS ── */}
          {section === 'sec-users' && (
            <section className="page-section active">
              <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="section-title" style={{ margin: 0 }}><div className="section-title-bar"></div><h2>Manage Users</h2></div>
                <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>➕ Create User</button>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'All', role: '' },
                  { label: '🎓 Students', role: 'student' },
                  { label: '🚛 Collectors', role: 'collector' },
                ].map((t) => (
                  <button
                    key={t.role}
                    className={`btn btn-sm ${userRoleFilter === t.role ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setUserRoleFilter(t.role)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No users found.</td></tr>
                    ) : users.map((u) => (
                      <tr key={u.userId}>
                        <td><strong>{u.userId}</strong></td>
                        <td>{u.name}</td>
                        <td style={{ fontSize: '.82rem' }}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'student' ? 'badge-done' : 'badge-progress'}`}>
                            {u.role === 'student' ? '🎓 Student' : '🚛 Collector'}
                          </span>
                        </td>
                        <td style={{ fontSize: '.82rem' }}>{u.dept || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleViewUser(u.userId)}>👁 View</button>
                            <button className="btn btn-red btn-sm" onClick={() => handleDeleteUser(u.userId, u.name)}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── GIVE REWARDS ── */}
          {section === 'sec-rewards' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🏆 Give Reward Points</h2></div>
              <div className="card" style={{ maxWidth: 520, marginBottom: '2rem' }}>
                <form onSubmit={handleAwardReward} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                  <div className="form-group">
                    <label className="form-label">Select Student</label>
                    <select className="form-select" value={rewStudentId} onChange={(e) => setRewStudentId(e.target.value)}>
                      <option value="">Choose a student…</option>
                      {students.map((s) => (
                        <option key={s.userId} value={s.userId}>{s.name} ({s.userId}) — {s.rewardPoints || 0} pts</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Activity / Reason</label>
                    <select className="form-select" value={rewActivity} onChange={(e) => setRewActivity(e.target.value)}>
                      <option value="Waste Photo Complaint">Waste Photo Complaint</option>
                      <option value="Dustbin Full Alert (Scan)">Dustbin Full Alert (Scan)</option>
                      <option value="Best Reporter of the Month">Best Reporter of the Month</option>
                      <option value="Campus Cleanliness Initiative">Campus Cleanliness Initiative</option>
                      <option value="Custom">Custom Activity…</option>
                    </select>
                  </div>
                  {rewActivity === 'Custom' && (
                    <div className="form-group">
                      <label className="form-label">Custom Activity Name</label>
                      <input className="form-input" type="text" placeholder="Describe the activity…" value={rewCustom} onChange={(e) => setRewCustom(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Points to Award</label>
                    <input className="form-input" type="number" placeholder="e.g. 50" min="1" max="500" value={rewPoints} onChange={(e) => setRewPoints(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-amber btn-lg">🏆 Award Points</button>
                </form>
              </div>
              <div className="card">
                <div className="section-title"><div className="section-title-bar"></div><h3>All Rewards Distributed</h3></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Name</th><th>Activity</th><th>Points</th><th>Date</th></tr></thead>
                    <tbody>
                      {allRewards.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--txt-muted)' }}>No rewards distributed yet.</td></tr>
                      ) : allRewards.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.studentId}</strong></td>
                          <td>{r.userName}</td>
                          <td>{r.activity}</td>
                          <td><span className="reward-pts">+{r.points}</span></td>
                          <td>{fmtDate(r.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── ADMIN PROFILE ── */}
          {section === 'sec-profile' && (
            <section className="page-section active">
              <div style={{ maxWidth: 580 }}>
                <div className="profile-header" style={{ marginBottom: '1.5rem' }}>
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar">{getInitials(profile?.name)}</div>
                  </div>
                  <div className="profile-info">
                    <h3>{profile?.name || '—'}</h3>
                    <p>{profile?.email}</p>
                    <div className="profile-meta">
                      <span className="profile-meta-tag" style={{ background: 'rgba(235,76,76,.1)', color: 'var(--clr-red)' }}>🔑 Administrator</span>
                    </div>
                  </div>
                </div>
                <div className="danger-zone">
                  <div className="danger-header">
                    <span style={{ fontSize: '2rem' }}>⚠️</span>
                    <h2>Change Admin Password</h2>
                  </div>
                  <p style={{ marginBottom: '1.5rem', fontSize: '.88rem', color: 'var(--clr-red)', opacity: .8, fontWeight: 500 }}>
                    This action changes the master admin password. Keep it secure.
                  </p>
                  <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--clr-red)' }}>Current Password</label>
                      <input className="form-input" type="password" value={apOld} onChange={(e) => setApOld(e.target.value)} placeholder="Current admin password" style={{ borderColor: 'rgba(235,76,76,.3)' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--clr-red)' }}>New Password</label>
                      <input className="form-input" type="password" value={apNew} onChange={(e) => setApNew(e.target.value)} placeholder="New password (min 6 chars)" style={{ borderColor: 'rgba(235,76,76,.3)' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--clr-red)' }}>Confirm New Password</label>
                      <input className="form-input" type="password" value={apConfirm} onChange={(e) => setApConfirm(e.target.value)} placeholder="Repeat new password" style={{ borderColor: 'rgba(235,76,76,.3)' }} />
                    </div>
                    <button type="submit" className="btn btn-red btn-lg" style={{ boxShadow: '0 4px 20px rgba(235,76,76,.35)' }}>
                      🔐 Change Admin Password
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Create User Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New User">
        <form onSubmit={handleCreateUser} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">User ID</label><input className="form-input" placeholder="e.g. STU2026001" value={cuId} onChange={(e) => setCuId(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-select" value={cuRole} onChange={(e) => setCuRole(e.target.value)}>
                <option value="student">🎓 Student</option>
                <option value="collector">🚛 Collector</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Full name" value={cuName} onChange={(e) => setCuName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="email@campus.edu" value={cuEmail} onChange={(e) => setCuEmail(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Department</label><input className="form-input" placeholder="e.g. Computer Science" value={cuDept} onChange={(e) => setCuDept(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Initial password" value={cuPass} onChange={(e) => setCuPass(e.target.value)} /></div>
          <div className="flex-between" style={{ gap: '.7rem', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full">Create User</button>
          </div>
        </form>
      </Modal>

      {/* View User Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="User Profile">
        {viewUserData && (
          <>
            <div className="profile-header" style={{ marginBottom: '1rem' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-green),var(--clr-navy))', display: 'grid', placeItems: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                {getInitials(viewUserData.name)}
              </div>
              <div>
                <h3>{viewUserData.name}</h3>
                <p style={{ fontSize: '.85rem' }}>{viewUserData.email}</p>
                <div className="profile-meta" style={{ marginTop: '.4rem' }}>
                  <span className="profile-meta-tag">{viewUserData.userId}</span>
                  <span className="profile-meta-tag">{viewUserData.dept || 'No dept'}</span>
                  <span className="profile-meta-tag" style={{ color: 'var(--clr-amber)' }}>🏆 {viewUserData.rewardPoints || 0} pts</span>
                </div>
              </div>
            </div>
            <div className="grid-2">
              <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-value">{viewUserComplaints.length}</div><div className="stat-label">Complaints</div></div>
              <div className="stat-card"><div className="stat-icon">⭐</div><div className="stat-value">{viewUserData.rewardPoints || 0}</div><div className="stat-label">Reward Pts</div></div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
