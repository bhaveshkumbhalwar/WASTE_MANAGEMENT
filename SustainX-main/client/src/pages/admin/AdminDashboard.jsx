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
  getOrders,
  updateOrderStatus,
  updateUser,
} from '../../services/api';

const NAV_ITEMS = [
  { id: 'sec-dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'sec-store-orders', label: 'Store Orders', icon: '🛍️' },
  { id: 'sec-collectors', label: 'Manage Collectors', icon: '🚛' },
  { id: 'sec-users', label: 'Manage Students', icon: '🎓' },
  { id: 'sec-rewards', label: 'Give Rewards', icon: '🏆' },
  { id: 'sec-profile', label: 'Profile', icon: '🔐' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [section, setSection] = useState('sec-dashboard');

  // Mobile navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({ 
    total: 0, pending: 0, progress: 0, done: 0, 
    students: 0, collectors: 0,
    orderAnalytics: { total: 0, delivered: 0, completionRate: 0, failedAttempts: 0, blockPerformance: [] }
  });
  const [allComplaints, setAllComplaints] = useState([]);

  // Users (students)
  const [studentUsers, setStudentUsers] = useState([]);
  const [createStudentModalOpen, setCreateStudentModalOpen] = useState(false);

  // Collectors
  const [collectors, setCollectors] = useState([]);
  const [createCollectorModalOpen, setCreateCollectorModalOpen] = useState(false);

  // Store Orders
  const [allOrders, setAllOrders] = useState([]);

  // View user modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewUserData, setViewUserData] = useState(null);
  const [viewUserComplaints, setViewUserComplaints] = useState([]);

  // Create Student form
  const [csName, setCsName] = useState('');
  const [csEmail, setCsEmail] = useState('');
  const [csDept, setCsDept] = useState('');
  const [csPass, setCsPass] = useState('');

  // Create Collector form
  const [ccName, setCcName] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [ccBlock, setCcBlock] = useState('');
  const [ccPass, setCcPass] = useState('');

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

  // Update Profile
  const [upName, setUpName] = useState('');

  /* ════════════ Data Loaders ════════════ */

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

  const loadStudentUsers = useCallback(async () => {
    try {
      const res = await getUsers('student');
      setStudentUsers(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadCollectors = useCallback(async () => {
    try {
      const res = await getUsers('collector');
      setCollectors(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await getUsers('student');
      setStudents(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadAllRewards = useCallback(async () => {
    try {
      const res = await getRewards();
      setAllRewards(
        res.data.map((r) => ({
          ...r,
          userName: r.user?.name || 'Unknown',
          userEmail: r.user?.email || 'N/A',
        }))
      );
    } catch { /* ignore */ }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getUserById(user._id);
      setProfile(res.data);
      setUpName(res.data.name || '');
    } catch { /* ignore */ }
  }, [user._id]);

  const loadStoreOrders = useCallback(async () => {
    try {
      const res = await getOrders();
      setAllOrders(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadStats();
    loadComplaints();
    loadStudentUsers();
    loadCollectors();
    loadStudents();
    loadAllRewards();
    loadProfile();
    loadStoreOrders();
  }, [loadStats, loadComplaints, loadStudentUsers, loadCollectors, loadStudents, loadAllRewards, loadProfile, loadStoreOrders]);

  /* ════════════ Handlers ════════════ */

  // Create Student
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!csName || !csEmail || !csPass) { showToast('Please fill all required fields.', 'warning'); return; }
    try {
      await createUser({ role: 'student', name: csName, email: csEmail, dept: csDept, password: csPass, block: 'A' });
      showToast(`Student ${csName} created successfully! ✅`);
      setCreateStudentModalOpen(false);
      setCsName(''); setCsEmail(''); setCsDept(''); setCsPass('');
      loadStudentUsers(); loadStats(); loadStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  // Create Collector (Admin only — uses existing POST /api/users with role=collector)
  const handleCreateCollector = async (e) => {
    e.preventDefault();
    if (!ccName || !ccEmail || !ccBlock || !ccPass) {
      showToast('Please fill all fields including Block.', 'warning');
      return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(ccEmail)) {
      showToast('Please enter a valid email.', 'warning');
      return;
    }
    if (ccPass.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    try {
      await createUser({
        role: 'collector',
        name: ccName,
        email: ccEmail,
        block: ccBlock,
        password: ccPass,
      });
      showToast(`Collector "${ccName}" created for Block ${ccBlock}! ✅`);
      setCreateCollectorModalOpen(false);
      setCcName(''); setCcEmail(''); setCcBlock(''); setCcPass('');
      loadCollectors(); loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating collector', 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUserApi(id);
      showToast(`User ${name} deleted.`, 'warning');
      loadStudentUsers(); loadCollectors(); loadStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleViewUser = async (id) => {
    try {
      const res = await getUserById(id);
      setViewUserData(res.data);
      const compRes = await getComplaints({ user: id });
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
      await addReward({ user: rewStudentId, activity, points: pts });
      const stu = students.find((s) => s._id === rewStudentId);
      showToast(`Awarded ${pts} pts to ${stu?.name || 'student'} for "${activity}" ✅`, 'success');
      setRewStudentId(''); setRewActivity('Waste Photo Complaint'); setRewCustom(''); setRewPoints('');
      loadAllRewards(); loadStudents(); loadStats();
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
      await changePassword(user._id, { oldPassword: apOld, newPassword: apNew });
      showToast('Admin password updated! 🔐', 'success');
      setApOld(''); setApNew(''); setApConfirm('');
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
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating profile', 'error');
    }
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { status: newStatus });
      showToast(`Order ${orderId} status set to ${newStatus} ✅`);
      loadStoreOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating status', 'error');
    }
  };

  const currentLabel = NAV_ITEMS.find((n) => n.id === section)?.label || '';

  return (
    <div className="app-layout">
      <Sidebar
        portalName="Admin Portal"
        icon="⚙️"
        navItems={NAV_ITEMS}
        activeSection={section}
        onNavigate={setSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="main-content">
        <Topbar title={currentLabel} onToggleMenu={() => setIsSidebarOpen(true)} />
        <div className="page-content">

          {/* ── DASHBOARD ── */}
          {section === 'sec-dashboard' && (
            <section className="page-section active">
              <div className="stat-grid mb-3">
                <StatCard icon="📋" value={stats.total} label="Total Complaints" borderColor="var(--clr-blue)" />
                <StatCard icon="⏳" value={stats.pending} label="Pending" borderColor="var(--clr-amber)" />
                <StatCard icon="🔄" value={stats.progress} label="In Progress" borderColor="var(--clr-blue)" />
                <StatCard icon="✅" value={stats.done} label="Resolved" borderColor="var(--clr-green)" />
                <StatCard icon="🛍️" value={stats.orderAnalytics?.total || 0} label="Store Sales" borderColor="var(--clr-brown)" />
                <StatCard icon="📈" value={`${stats.orderAnalytics?.completionRate || 0}%`} label="Completion Rate" borderColor="var(--clr-green)" />
                <StatCard icon="⚠️" value={stats.orderAnalytics?.failedAttempts || 0} label="Auth Failures" borderColor="var(--clr-red)" />
                <StatCard icon="🎓" value={stats.students} label="Students" borderColor="var(--clr-navy)" />
                <StatCard icon="🚛" value={stats.collectors} label="Collectors" borderColor="var(--clr-green)" />
              </div>
              
              <div className="grid-2 mb-3">
                <div className="card">
                  <div className="section-title"><div className="section-title-bar"></div><h3>Fulfillment by Block</h3></div>
                  <div className="table-wrap">
                    <table style={{ fontSize: '.85rem' }}>
                      <thead><tr><th>Campus Block</th><th>Successful Deliveries</th></tr></thead>
                      <tbody>
                        {['A', 'B', 'C', 'D', 'E'].map(block => {
                          const performance = stats.orderAnalytics?.blockPerformance?.find(p => p._id === block);
                          return (
                            <tr key={block}>
                              <td><strong>Block {block}</strong></td>
                              <td><span className="badge badge-success">{performance?.count || 0} Delivered</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                  <h3>Security Health</h3>
                  <p className="text-muted" style={{ fontSize: '.9rem' }}>
                    Marketplace security is currently <strong>Optimal</strong>. 
                    {stats.orderAnalytics?.failedAttempts > 10 ? ' High volume of auth failures detected.' : ' Minimal failed verification attempts.'}
                  </p>
                </div>
              </div>
              <div className="card">
                <div className="section-title"><div className="section-title-bar"></div><h2>All Complaints</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ID</th><th>Student</th><th>Location</th><th>Block</th><th>Assigned To</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {allComplaints.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No complaints yet.</td></tr>
                      ) : allComplaints.map((c) => (
                        <tr key={c.complaintId}>
                          <td><strong style={{ color: 'var(--clr-blue)' }}>{c.complaintId}</strong></td>
                          <td>{c.user?.name || '—'}</td>
                          <td>{c.location}</td>
                          <td><span className="badge badge-progress">🏢 {c.block || '—'}</span></td>
                          <td>{c.assignedTo?.name || <span style={{ color: 'var(--txt-muted)', fontSize: '.8rem' }}>Unassigned</span>}</td>
                          <td>{fmtDate(c.createdAt)}</td>
                          <td>
                            <StatusBadge status={c.status} />
                            {c.status === 'completed' && c.completionImage && (
                              <div style={{ marginTop: '.4rem' }}>
                                <a 
                                  href={c.completionImage} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '.7rem', color: 'var(--clr-green)', fontWeight: 700, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '.2rem' }}
                                >
                                  📸 View Proof
                                </a>
                              </div>
                            )}
                            {c.status === 'rejected' && c.rejectionReason && (
                              <div style={{ fontSize: '.7rem', color: 'var(--clr-red)', marginTop: '.3rem', maxWidth: '150px', lineHeight: 1.2 }}>
                                <strong>Reason:</strong> {c.rejectionReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── STORE ORDERS ── */}
          {section === 'sec-store-orders' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🛍️ Store Orders Management</h2></div>
              
              <div className="stat-grid mb-3">
                <StatCard icon="📦" value={allOrders.length} label="Total Orders" />
                <StatCard icon="⏳" value={allOrders.filter(o => o.status === 'pending').length} label="Pending" />
                <StatCard icon="🔄" value={allOrders.filter(o => o.status === 'approved').length} label="In Progress" />
                <StatCard icon="🎁" value={allOrders.filter(o => o.status === 'ready_for_pickup').length} label="Ready" />
                <StatCard icon="✅" value={allOrders.filter(o => o.status === 'delivered').length} label="Delivered" />
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Status Tracking</th><th>Actions</th></tr></thead>
                  <tbody>
                    {allOrders.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No marketplace activity yet.</td></tr>
                    ) : allOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td><strong style={{ color: 'var(--clr-blue)' }}>{o.orderId}</strong><div className="text-muted" style={{ fontSize: '.7rem' }}>{fmtDate(o.createdAt)}</div></td>
                        <td>{o.userName}<div className="text-muted" style={{ fontSize: '.7rem' }}>{o.user?.email || '—'}</div></td>
                        <td>{o.itemName}<div className="text-muted" style={{ fontSize: '.7rem' }}>⭐ {o.pointsUsed} pts</div></td>
                        <td style={{ minWidth: 200 }}>
                          <div className="status-progress-container" style={{ margin: 0, paddingTop: '.5rem', transform: 'scale(0.85)', transformOrigin: 'left' }}>
                            {['pending', 'approved', 'ready_for_pickup', 'delivered'].map((s, idx, steps) => {
                              const statusOrder = ['pending', 'approved', 'ready_for_pickup', 'delivered'];
                              const currentIdx = statusOrder.indexOf(o.status);
                              const isCompleted = idx < currentIdx || o.status === 'delivered';
                              const isActive = idx === currentIdx && o.status !== 'delivered';
                              return (
                                <div key={idx} className={`progress-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                  <div className="step-point" style={{ width: 24, height: 24, fontSize: '.7rem' }}>{isCompleted ? '✔' : idx + 1}</div>
                                  <div className="step-line" style={{ top: 12 }} />
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: '.7rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', marginTop: '-.5rem', color: 'var(--clr-blue)' }}>{o.status.replace(/_/g, ' ')}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            {o.status === 'pending' && <button className="btn btn-sm btn-blue" onClick={() => handleOrderStatus(o.orderId, 'approved')}>Approve</button>}
                            {o.status === 'approved' && <button className="btn btn-sm btn-amber" onClick={() => handleOrderStatus(o.orderId, 'ready_for_pickup')}>Ready</button>}
                            {o.status === 'ready_for_pickup' && <button className="btn btn-sm btn-primary" onClick={() => handleOrderStatus(o.orderId, 'delivered')}>Deliver</button>}
                            {o.status === 'delivered' && <span className="text-muted" style={{ fontSize: '.75rem' }}>Filled</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── MANAGE COLLECTORS ── */}
          {section === 'sec-collectors' && (
            <section className="page-section active">
              <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="section-title" style={{ margin: 0 }}><div className="section-title-bar"></div><h2>🚛 Manage Collectors</h2></div>
                <button className="btn btn-primary" onClick={() => setCreateCollectorModalOpen(true)}>➕ Add Collector</button>
              </div>

              <div className="stat-grid mb-3">
                <StatCard icon="🚛" value={collectors.length} label="Total Collectors" borderColor="var(--clr-green)" />
                {['A','B','C','D','E'].map((b) => (
                  <StatCard key={b} icon="🏢" value={collectors.filter((c) => c.block === b).length} label={`Block ${b}`} />
                ))}
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Email</th><th>Name</th><th>Email</th><th>Block</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {collectors.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No collectors found. Add one using the button above.</td></tr>
                    ) : collectors.map((c) => (
                      <tr key={c._id}>
                        <td><strong style={{ fontSize: '.75rem' }}>{c.email}</strong></td>
                        <td>{c.name}</td>
                        <td style={{ fontSize: '.82rem' }}>{c.email}</td>
                        <td><span className="badge badge-progress" style={{ fontWeight: 700 }}>🏢 Block {c.block || '—'}</span></td>
                        <td style={{ fontSize: '.82rem' }}>{fmtDate(c.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleViewUser(c._id)}>👁 View</button>
                            <button className="btn btn-red btn-sm" onClick={() => handleDeleteUser(c._id, c.name)}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── MANAGE STUDENTS ── */}
          {section === 'sec-users' && (
            <section className="page-section active">
              <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="section-title" style={{ margin: 0 }}><div className="section-title-bar"></div><h2>🎓 Manage Students</h2></div>
                <button className="btn btn-primary" onClick={() => setCreateStudentModalOpen(true)}>➕ Create Student</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Email</th><th>Name</th><th>Email</th><th>Department</th><th>Reward Pts</th><th>Actions</th></tr></thead>
                  <tbody>
                    {studentUsers.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--txt-muted)' }}>No students found.</td></tr>
                    ) : studentUsers.map((u) => (
                      <tr key={u._id}>
                        <td><strong style={{ fontSize: '.75rem' }}>{u.email}</strong></td>
                        <td>{u.name}</td>
                        <td style={{ fontSize: '.82rem' }}>{u.email}</td>
                        <td style={{ fontSize: '.82rem' }}>{u.dept || '—'}</td>
                        <td><span className="reward-pts">🏆 {u.rewardPoints || 0}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleViewUser(u._id)}>👁 View</button>
                            <button className="btn btn-red btn-sm" onClick={() => handleDeleteUser(u._id, u.name)}>🗑 Delete</button>
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
                        <option key={s._id} value={s._id}>{s.name} ({s.email}) — {s.rewardPoints || 0} pts</option>
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
                          <td><strong>{r.userEmail}</strong></td>
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

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="section-title" style={{ marginBottom: '1rem' }}><div className="section-title-bar"></div><h2>Update Profile</h2></div>
                  <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" value={upName} onChange={(e) => setUpName(e.target.value)} placeholder="Admin Name" /></div>
                    <button type="submit" className="btn btn-primary">✏️ Update Name</button>
                  </form>
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

      {/* ══ Create Collector Modal ══ */}
      <Modal isOpen={createCollectorModalOpen} onClose={() => setCreateCollectorModalOpen(false)} title="Add New Collector">
        <form onSubmit={handleCreateCollector} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Collector's full name" value={ccName} onChange={(e) => setCcName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">College Email ID</label>
            <input className="form-input" type="email" placeholder="email@campus.edu" value={ccEmail} onChange={(e) => setCcEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Block</label>
            <select className="form-select" value={ccBlock} onChange={(e) => setCcBlock(e.target.value)}>
              <option value="">Select Block…</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
              <option value="E">Block E</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Initial password (min 6 chars)" value={ccPass} onChange={(e) => setCcPass(e.target.value)} />
          </div>
          <div className="flex-between" style={{ gap: '.7rem', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setCreateCollectorModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full">Add Collector</button>
          </div>
        </form>
      </Modal>

      {/* ══ Create Student Modal ══ */}
      <Modal isOpen={createStudentModalOpen} onClose={() => setCreateStudentModalOpen(false)} title="Create New Student">
        <form onSubmit={handleCreateStudent} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Full name" value={csName} onChange={(e) => setCsName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="email@campus.edu" value={csEmail} onChange={(e) => setCsEmail(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Department</label><input className="form-input" placeholder="e.g. Computer Science" value={csDept} onChange={(e) => setCsDept(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Initial password" value={csPass} onChange={(e) => setCsPass(e.target.value)} /></div>
          <div className="flex-between" style={{ gap: '.7rem', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setCreateStudentModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full">Create Student</button>
          </div>
        </form>
      </Modal>

      {/* ══ View User Modal ══ */}
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
                  <span className="profile-meta-tag">{viewUserData.email}</span>
                  <span className="profile-meta-tag">
                    {viewUserData.role === 'collector' ? `🚛 Collector` : `🎓 Student`}
                  </span>
                  {viewUserData.role === 'collector' && viewUserData.block && (
                    <span className="profile-meta-tag" style={{ color: 'var(--clr-blue)' }}>🏢 Block {viewUserData.block}</span>
                  )}
                  {viewUserData.dept && <span className="profile-meta-tag">{viewUserData.dept}</span>}
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
