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
  getRewards,
  getStoreItems,
  redeemStoreItem,
  getOrders,
  getOrderById,
  updateOrderStatus,
  assignOrderApi,
  updateUser,
  completeComplaintApi,
} from '../../services/api';

const NAV_ITEMS = [
  { id: 'sec-dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'sec-store-orders', label: 'Manage Orders', icon: '📦' },
  { id: 'sec-history', label: 'History', icon: '✅' },
  { id: 'sec-store', label: 'Eco Store', icon: '🛒' },
  { id: 'sec-my-orders', label: 'My Redemptions', icon: '🎁' },
  { id: 'sec-awareness', label: 'Awareness', icon: '🌱' },
  { id: 'sec-profile', label: 'Profile', icon: '👤' },
];

export default function CollectorDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [section, setSection] = useState('sec-dashboard');

  // Mobile navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Profile
  const [profile, setProfile] = useState(null);
  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  // Update Profile
  const [upName, setUpName] = useState('');

  // Proof of Completion
  const [completionFile, setCompletionFile] = useState(null);
  const [completionPreview, setCompletionPreview] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Store & Rewards
  const [storeItems, setStoreItems] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [rewardTotal, setRewardTotal] = useState(0);

  // Store orders (to manage)
  const [storeOrders, setStoreOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderCache, setOrderCache] = useState({});

  const loadStats = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      // Backend handles block filtering — frontend just displays what it gets
      const res = await getComplaints(dashFilter ? { status: dashFilter } : {});

      // Debug log: verify only correct block data is received
      console.log(`📋 [COLLECTOR UI] Fetched ${res.data.length} complaint(s) | Block filter applied by backend`);
      if (res.data.length > 0) {
        const blocks = [...new Set(res.data.map(c => c.block))];
        console.log(`📋 [COLLECTOR UI] Blocks in response: ${blocks.join(', ')}`);
      }

      // Only filter out completed for "All Open" tab (status filter, NOT block filter)
      const open = dashFilter ? res.data : res.data.filter((c) => c.status !== 'completed' && c.status !== 'rejected');

      // Sort: IoT alerts first, then by date (newest first)
      const sorted = [...open].sort((a, b) => {
        if (a.type === 'iot' && b.type !== 'iot') return -1;
        if (a.type !== 'iot' && b.type === 'iot') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setOpenComplaints(sorted);
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
      const res = await getUserById(user._id);
      setProfile(res.data);
      setUpName(res.data.name || '');
      setRewardTotal(res.data.rewardPoints || 0);
    } catch { /* ignore */ }
  }, [user._id]);

  const loadStoreItems = useCallback(async () => {
    try {
      const res = await getStoreItems();
      setStoreItems(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadMyOrders = useCallback(async () => {
    try {
      const res = await getOrders({ user: user._id });
      setMyOrders(res.data);
    } catch { /* ignore */ }
  }, [user._id]);

  const loadRewardHistory = useCallback(async () => {
    try {
      const res = await getRewards({ user: user._id });
      setRewardHistory(res.data);
    } catch { /* ignore */ }
  }, [user._id]);

  const loadStoreOrders = useCallback(async () => {
    try {
      const params = {};
      if (orderFilter) params.status = orderFilter;
      const res = await getOrders(params);
      setStoreOrders(res.data);
    } catch { /* ignore */ }
  }, [orderFilter]);

  useEffect(() => {
    loadStats();
    loadDashboard();
    loadHistory();
    loadProfile();
    loadStoreOrders();
    loadStoreItems();
    loadMyOrders();
    loadRewardHistory();
  }, [loadStats, loadDashboard, loadHistory, loadProfile, loadStoreOrders, loadStoreItems, loadMyOrders, loadRewardHistory]);

  const handleRedeem = async (itemId) => {
    try {
      const res = await redeemStoreItem(itemId);
      showToast(`Item redeemed! Order ${res.data.order.orderId} created. Remaining: ${res.data.remainingPoints} pts ✅`);
      loadStoreItems();
      loadMyOrders();
      loadProfile();
      loadRewardHistory();
      loadStoreOrders(); // Refresh manager view too
    } catch (err) {
      showToast(err.response?.data?.message || 'Error redeeming item', 'error');
    }
  };

  // Polling every 5 seconds for real-time IoT alerts
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
      loadDashboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadStats, loadDashboard]);

  // IoT Alert Side Effect
  useEffect(() => {
    const newIot = openComplaints.find(c => c.type === 'iot' && c.status === 'pending');
    if (newIot) {
      // Use a simple local storage or ref to avoid repeating toast for the same complaint
      const lastAlertId = sessionStorage.getItem('last_iot_alert');
      if (lastAlertId !== newIot.complaintId) {
        showToast(`🚨 DUSTBIN FULL: IoT Alert in Block ${newIot.block}!`, 'warning');
        sessionStorage.setItem('last_iot_alert', newIot.complaintId);
      }
    }
  }, [openComplaints, showToast]);

  const handleUpdateStatus = async () => {
    if (modalStatus === 'rejected' && !rejectionReason.trim()) {
      showToast('Please provide a reason for rejection.', 'warning');
      return;
    }

    if (modalStatus === 'completed' && !completionFile) {
      showToast('Proof of completion (photo) is required.', 'warning');
      return;
    }

    try {
      setIsCompleting(true);
      if (modalStatus === 'completed') {
        const formData = new FormData();
        formData.append('image', completionFile);
        await completeComplaintApi(activeId, formData);
        showToast(`Complaint ${activeId} marked as completed with proof! ✅`);
      } else {
        const body = { status: modalStatus, note: `Status updated to ${modalStatus}` };
        if (modalStatus === 'rejected') {
          body.rejectionReason = rejectionReason.trim();
        }
        const res = await updateComplaintStatus(activeId, body);
        showToast(`Complaint ${activeId} marked as "${modalStatus}" ✅`);
        
        // If completed (fallback for older logic), show reward message
        if (modalStatus === 'completed' && res.data.rewardGiven) {
          showToast('🎉 You earned 10 reward points!', 'info');
        }
      }

      setModalOpen(false);
      setRejectionReason('');
      setCompletionFile(null);
      setCompletionPreview(null);
      loadDashboard();
      loadHistory();
      loadStats();
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompletionFile(file);
      setCompletionPreview(URL.createObjectURL(file));
    }
  };

  const handleOrderStatus = async (orderId, newStatus, code) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'delivered') {
        if (!code) { showToast('Please enter the pickup code.', 'warning'); return; }
        payload.verificationCode = code;
      }

      const res = await updateOrderStatus(orderId, payload);
      
      if (newStatus === 'delivered') {
        setIsSuccess(true);
        showToast('Order delivered successfully! ✅', 'success');
        if (res.data.rewardGiven) {
          setTimeout(() => showToast('🚚 Delivery bonus: +20 reward points!', 'info'), 1500);
        }
      } else {
        showToast(`Order ${orderId} → ${newStatus} ✅`);
      }

      setVerificationCode('');
      loadStoreOrders();
      loadProfile();
      
      // Update cache
      setOrderCache(prev => ({ ...prev, [orderId]: res.data }));
      setSelectedOrder(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating order', 'error');
    }
  };

  const handleTakeOrder = async (orderId) => {
    try {
      await assignOrderApi(orderId);
      showToast(`Order ${orderId} assigned to you! 👍`);
      loadStoreOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error taking order', 'error');
    }
  };

  const handleViewDetails = async (id) => {
    // Check cache first
    if (orderCache[id]) {
      setSelectedOrder(orderCache[id]);
      setOrderModalOpen(true);
      setIsSuccess(false);
      return;
    }

    try {
      setIsOrderLoading(true);
      setIsSuccess(false);
      const res = await getOrderById(id);
      setSelectedOrder(res.data);
      setOrderCache(prev => ({ ...prev, [id]: res.data }));
      setOrderModalOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error fetching details', 'error');
    } finally {
      setIsOrderLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!cpOld || !cpNew || !cpConfirm) { showToast('Please fill all fields.', 'error'); return; }
    if (cpNew !== cpConfirm) { showToast('Passwords do not match.', 'error'); return; }
    if (cpNew.length < 6) { showToast('Password must be ≥ 6 characters.', 'warning'); return; }
    try {
      await changePassword(user._id, { oldPassword: cpOld, newPassword: cpNew });
      showToast('Password updated! ✅');
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

  const currentLabel = NAV_ITEMS.find((n) => n.id === section)?.label || '';

  const filterTabs = [
    { label: 'All Open', filter: '' },
    { label: '⏳ Pending', filter: 'pending' },
    { label: '🔄 In Progress', filter: 'in-progress' },
    { label: '❌ Rejected', filter: 'rejected' },
  ];

  return (
    <div className="app-layout">
      <Sidebar
        portalName="Collector Portal"
        icon="🚛"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
                <span className="badge badge-progress" style={{ fontSize: '.85rem', fontWeight: 700, padding: '.4rem .8rem' }}>
                  🏢 Block {user.block || '—'}
                </span>
                <span style={{ fontSize: '.82rem', color: 'var(--txt-muted)' }}>Showing complaints for your block only</span>
              </div>

              {/* IoT Alert Banner */}
              {openComplaints.filter(c => c.type === 'iot' && c.status === 'pending').length > 0 && (
                <div className="iot-alert-banner">
                  <div className="iot-alert-banner-inner">
                    <span className="iot-alert-pulse"></span>
                    <span style={{ fontSize: '1.1rem' }}>🚨</span>
                    <strong>IoT ALERT</strong>
                    <span style={{ opacity: .85 }}>
                      {openComplaints.filter(c => c.type === 'iot' && c.status === 'pending').length} smart dustbin{openComplaints.filter(c => c.type === 'iot' && c.status === 'pending').length > 1 ? 's' : ''} require immediate collection
                    </span>
                  </div>
                </div>
              )}

              <div className="stat-grid mb-3">
                <StatCard icon="📋" value={stats.total} label="Block Complaints" />
                <StatCard icon="⏳" value={stats.pending} label="Pending" />
                <StatCard icon="🔄" value={stats.progress} label="In Progress" />
                <StatCard icon="📡" value={openComplaints.filter(c => c.type === 'iot').length} label="IoT Alerts" color="var(--clr-red)" />
                <StatCard icon="⭐" value={rewardTotal} label="Your Points" color="var(--clr-amber)" />
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
                  <div className={`complaint-card ${c.type === 'iot' ? 'complaint-card-iot' : ''}`} key={c.complaintId}>
                    <div className="complaint-img">
                      {c.image ? (
                        <img src={c.image} alt="complaint" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : c.type === 'iot' ? (
                        '📡'
                      ) : (
                        '🗑️'
                      )}
                    </div>
                    <div className="complaint-body">
                      <div className="flex-between">
                        <div className="complaint-id">{c.complaintId}</div>
                        {c.type === 'iot' && (
                          <span className="iot-badge">
                            <span className="iot-badge-dot"></span>
                            IoT Alert
                          </span>
                        )}
                      </div>
                      <div className="complaint-location">📍 {c.location}</div>
                      {c.type === 'iot' && c.binId && (
                        <div style={{ fontSize: '.78rem', color: 'var(--clr-blue)', fontWeight: 600, margin: '.2rem 0' }}>
                          🔗 Bin ID: {c.binId}
                        </div>
                      )}
                      <div className="complaint-desc" style={c.type === 'iot' ? { fontWeight: 700, color: 'var(--clr-red)' } : {}}>{c.description}</div>
                      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                        <StatusBadge status={c.status} />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setActiveId(c.complaintId); setSelectedComplaint(c); setModalStatus('in-progress'); setModalOpen(true); }}
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

          {/* ── STORE ORDERS ── */}
          {section === 'sec-store-orders' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>📦 Store Orders</h2></div>
              <div className="stat-grid mb-3">
                <StatCard icon="📦" value={storeOrders.length} label="Total Orders" />
                <StatCard icon="⏳" value={storeOrders.filter(o => o.status === 'pending').length} label="Pending" />
                <StatCard icon="👍" value={storeOrders.filter(o => o.status === 'approved').length} label="Approved" />
                <StatCard icon="✅" value={storeOrders.filter(o => o.status === 'delivered').length} label="Delivered" />
              </div>

              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                {[{ label: 'All', filter: '' }, { label: '⏳ Pending', filter: 'pending' }, { label: '👍 Approved', filter: 'approved' }, { label: '✅ Delivered', filter: 'delivered' }].map((t) => (
                  <button key={t.filter} className={`btn btn-sm ${orderFilter === t.filter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOrderFilter(t.filter)}>{t.label}</button>
                ))}
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order ID</th><th>Student</th><th>Item</th><th>Points</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {storeOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--txt-muted)' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
                          <strong>No orders available for Block {user.block || 'your block'}.</strong>
                          <p style={{ fontSize: '.85rem', marginTop: '.5rem' }}>Active redemptions from students in this block will appear here.</p>
                        </td>
                      </tr>
                    ) : storeOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td>
                          <button 
                            className="btn-link" 
                            style={{ fontWeight: 700, color: 'var(--clr-blue)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => handleViewDetails(o.orderId)}
                          >
                            {o.orderId}
                          </button>
                        </td>
                        <td>
                          <div style={{ fontSize: '.85rem' }}>{o.userName}</div>
                          <div className="text-muted" style={{ fontSize: '.72rem' }}>{o.user?.email || '—'}</div>
                        </td>
                        <td><span style={{ fontWeight: 600, color: 'var(--clr-amber)' }}>⭐ {o.pointsUsed}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                            <StatusBadge status={o.status === 'ready_for_pickup' ? 'ready' : o.status === 'approved' ? 'in-progress' : o.status === 'delivered' ? 'completed' : 'pending'} />
                            {!o.assignedTo && <span className="badge badge-amber" style={{ fontSize: '.7rem' }}>🆕 Available</span>}
                            {o.assignedTo === user._id && <span className="badge badge-done" style={{ fontSize: '.7rem' }}>🔒 Assigned to You</span>}
                          </div>
                        </td>
                        <td>
                          {!o.assignedTo ? (
                            <button className="btn btn-sm btn-primary" onClick={() => handleTakeOrder(o._id)}>🤝 Take Order</button>
                          ) : o.assignedTo === user._id ? (
                            <div style={{ display: 'flex', gap: '.4rem' }}>
                              {o.status === 'pending' && (
                                <button className="btn btn-sm btn-blue" onClick={() => handleOrderStatus(o.orderId, 'approved')}>👍 Approve</button>
                              )}
                              {o.status === 'approved' && (
                                <button className="btn btn-sm btn-amber" onClick={() => handleOrderStatus(o.orderId, 'ready_for_pickup')}>🎁 Ready for Pickup</button>
                              )}
                              {o.status === 'ready_for_pickup' && (
                                <button className="btn btn-sm btn-primary" onClick={() => handleViewDetails(o.orderId)}>🚚 Deliver</button>
                              )}
                              {o.status === 'delivered' && (
                                <span className="text-muted" style={{ fontSize: '.8rem' }}>Claimed</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '.8rem' }}>Assigned to other</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── ECO STORE ── */}
          {section === 'sec-store' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🛒 Eco Store</h2></div>
              <p style={{ marginBottom: '1.2rem', color: 'var(--txt-muted)', fontSize: '.9rem' }}>
                Redeem your hard-earned reward points for eco-friendly products! You have <strong style={{ color: 'var(--clr-green)' }}>{rewardTotal} pts</strong>.
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
                        loading="lazy"
                        onError={(e) => { e.target.src = "https://via.placeholder.com/200"; }}
                      />
                      <span className="store-eco-badge">♻️ Eco-friendly</span>
                    </div>
                    <div className="store-card-body">
                      <div className="store-card-name">{item.name}</div>
                      <span className="store-category-tag">{item.category || 'other'}</span>
                      <div className="store-card-desc">{item.description}</div>
                      <div className="store-card-footer">
                        <div className="store-card-points">⭐ {item.pointsRequired} pts</div>
                        <span className="text-muted" style={{ fontSize: '.75rem' }}>{item.stock > 0 ? `${item.stock} left` : 'Out of stock'}</span>
                      </div>
                      <button
                        className={`btn btn-sm btn-full ${rewardTotal >= item.pointsRequired && item.stock > 0 ? 'btn-primary' : 'btn-ghost'}`}
                        disabled={rewardTotal < item.pointsRequired || item.stock <= 0}
                        onClick={() => handleRedeem(item._id)}
                        style={{ marginTop: '.6rem' }}
                      >
                        {item.stock <= 0 ? '❌ Out of Stock' : rewardTotal < item.pointsRequired ? `🔒 Need ${item.pointsRequired - rewardTotal} pts` : '🛒 Redeem'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── MY REDEMPTIONS ── */}
          {section === 'sec-my-orders' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🎁 My Redemptions & Reward History</h2></div>
              
              <div className="stat-grid mb-3">
                <StatCard icon="⭐" value={rewardTotal} label="Available Points" color="var(--clr-amber)" />
                <StatCard icon="🛒" value={myOrders.length} label="Total Redemptions" />
                <StatCard icon="🎁" value={myOrders.filter(o => o.status === 'ready_for_pickup').length} label="Ready for Pickup" />
              </div>

              <div className="grid-2 mb-3">
                <div className="card">
                  <div className="section-title"><div className="section-title-bar"></div><h3>Recent Points Earned</h3></div>
                  <div className="table-wrap">
                    <table style={{ fontSize: '.85rem' }}>
                      <thead><tr><th>Activity</th><th>Points</th><th>Date</th></tr></thead>
                      <tbody>
                        {rewardHistory.length === 0 ? (
                          <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>No rewards yet.</td></tr>
                        ) : rewardHistory.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td>{r.activity}</td>
                            <td style={{ color: 'var(--clr-green)', fontWeight: 700 }}>+{r.points}</td>
                            <td>{fmtDate(r.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="order-list-vertical">
                  <div className="section-title"><div className="section-title-bar"></div><h3>My Redemption Orders</h3></div>
                  {myOrders.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                      <p className="text-muted">No items redeemed yet.</p>
                    </div>
                  ) : myOrders.map((o) => (
                    <div className="card order-tracking-card mb-2" key={o.orderId} style={{ padding: '1rem' }}>
                      <div className="flex-between">
                        <strong style={{ color: 'var(--clr-blue)' }}>{o.orderId}</strong>
                        <span className="text-muted" style={{ fontSize: '.75rem' }}>{fmtDate(o.createdAt)}</span>
                      </div>
                      <div style={{ fontWeight: 600, margin: '.3rem 0' }}>{o.itemName}</div>
                      <div className="order-pickup-info" style={{ gap: '.5rem', fontSize: '.8rem', background: 'none', padding: 0 }}>
                        <div className="info-row"><span>📍</span> {o.pickupLocation || 'Admin Office'}</div>
                        <div className="info-row"><span>🕒</span> {o.pickupTime || '10 AM - 5 PM'}</div>
                        {o.pickupCode && <div className="info-row"><span>🔐</span> <strong>{o.pickupCode}</strong></div>}
                      </div>
                      <div style={{ marginTop: '.5rem' }}>
                        <StatusBadge status={o.status === 'ready_for_pickup' ? 'ready' : o.status === 'approved' ? 'in-progress' : o.status === 'delivered' ? 'completed' : 'pending'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── AWARENESS ── */}
          {section === 'sec-awareness' && (
            <section className="page-section active">
              <div className="section-title"><div className="section-title-bar"></div><h2>🌱 Waste Management Importance</h2></div>
              <div className="grid-details">
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
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clr-navy)' }}>{profile?.name || user?.name || 'SustainX Collector'}</h3>
                  <p style={{ marginBottom: '.4rem', color: 'var(--txt-muted)' }}>{profile?.email || user?.email}</p>
                  <div className="profile-meta">
                    <span className="profile-meta-tag">🚛 Collector</span>
                    <span className="profile-meta-tag">🏢 Block {profile?.block || 'All'}</span>
                    <span className="profile-meta-tag">⭐ {rewardTotal} Reward Points</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 460 }}>
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
            </section>
          )}

        </div>
      </main>

      {/* Complaint Detail + Status Modal */}
      <Modal id="update-modal" isOpen={modalOpen} onClose={() => { setModalOpen(false); setRejectionReason(''); setCompletionFile(null); setCompletionPreview(null); }} title="📋 Complaint Details">
        {selectedComplaint && (
          <div style={{ marginBottom: '1rem' }}>
            {/* Complaint Image */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div className="info-label" style={{ marginBottom: '.4rem' }}>📸 Initial Photo</div>
                {selectedComplaint.image ? (
                  <img
                    src={selectedComplaint.image}
                    alt="Initial"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ height: '120px', borderRadius: '8px', background: 'rgba(0,0,0,.04)', display: 'grid', placeItems: 'center', color: 'var(--txt-muted)', fontSize: '.8rem' }}>No image</div>
                )}
              </div>
              {selectedComplaint.status === 'completed' && selectedComplaint.completionImage && (
                <div style={{ flex: 1 }}>
                  <div className="info-label" style={{ marginBottom: '.4rem', color: 'var(--clr-green)' }}>✅ Completion Proof</div>
                  <img
                    src={`${selectedComplaint.completionImage}`}
                    alt="Completion"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--clr-green)' }}
                  />
                </div>
              )}
            </div>

            {/* Complaint Details Grid */}
            <div className="grid-2" style={{ gap: '.8rem', marginBottom: '1rem', fontSize: '.88rem' }}>
              <div>
                <div className="info-label">📋 Complaint ID</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-blue)' }}>{selectedComplaint.complaintId}</div>
              </div>
              <div>
                <div className="info-label">🏢 Block</div>
                <div style={{ fontWeight: 700 }}>Block {selectedComplaint.block}</div>
              </div>
              <div>
                <div className="info-label">📍 Location</div>
                <div style={{ fontWeight: 600 }}>{selectedComplaint.location}</div>
              </div>
              <div>
                <div className="info-label">🗑️ Waste Type</div>
                <div style={{ fontWeight: 600 }}>{selectedComplaint.wasteType}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="info-label">📝 Description</div>
                <div style={{ fontWeight: 500, lineHeight: 1.5 }}>{selectedComplaint.description}</div>
              </div>
              <div>
                <div className="info-label">📅 Date</div>
                <div>{fmtDate(selectedComplaint.createdAt)}</div>
              </div>
              <div>
                <div className="info-label">📌 Current Status</div>
                <StatusBadge status={selectedComplaint.status} />
              </div>
            </div>

            {/* Rejection reason display if already rejected */}
            {selectedComplaint.status === 'rejected' && selectedComplaint.rejectionReason && (
              <div style={{ padding: '.8rem 1rem', borderRadius: '8px', background: 'rgba(235,76,76,.08)', border: '1px solid rgba(235,76,76,.2)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--clr-red)', textTransform: 'uppercase', marginBottom: '.3rem' }}>❌ Rejection Reason</div>
                <div style={{ fontSize: '.88rem' }}>{selectedComplaint.rejectionReason}</div>
              </div>
            )}
          </div>
        )}

        {/* Status update form — only if NOT already completed/rejected */}
        {selectedComplaint && !['completed', 'rejected'].includes(selectedComplaint.status) && (
          <>
            <div style={{ borderBottom: '2px dashed var(--border)', margin: '.8rem 0' }}></div>
            <div className="form-group mb-2">
              <label className="form-label">Update Status</label>
              <select className="form-select" value={modalStatus} onChange={(e) => setModalStatus(e.target.value)}>
                <option value="in-progress">🔄 In Progress</option>
                <option value="completed">✅ Completed</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>

            {modalStatus === 'rejected' && (
              <div className="form-group mb-2">
                <label className="form-label">Rejection Reason <span style={{ color: 'var(--clr-red)' }}>*</span></label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Duplicate complaint, area already cleaned, invalid location..."
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
            )}

            {modalStatus === 'completed' && (
              <div className="form-group mb-2">
                <label className="form-label">Upload Proof of Completion <span style={{ color: 'var(--clr-red)' }}>*</span></label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {completionPreview && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '.75rem', color: 'var(--txt-muted)', marginBottom: '.5rem' }}>Preview:</p>
                    <img
                      src={completionPreview}
                      alt="Completion preview"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
              </div>
            )}

            <button
              className={`btn btn-full ${modalStatus === 'rejected' ? 'btn-red' : 'btn-primary'} ${isCompleting ? 'btn-disabled' : ''}`}
              onClick={handleUpdateStatus}
              disabled={isCompleting || (modalStatus === 'completed' && !completionFile)}
            >
              {isCompleting ? '⌛ Processing...' : modalStatus === 'rejected' ? '❌ Reject Complaint' : '✅ Save Status'}
            </button>
          </>
        )}
      </Modal>

      {/* Order Detail Modal */}
      <Modal 
        id="order-detail-modal" 
        isOpen={orderModalOpen} 
        onClose={() => { setOrderModalOpen(false); setVerificationCode(''); setIsSuccess(false); }} 
        title={isSuccess ? "🎉 Delivery Successful" : "📦 Order Details"}
      >
        {isOrderLoading ? (
          <div style={{ padding: '1.5rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: '2rem' }}></div>
            <div className="skeleton skeleton-rect" style={{ marginBottom: '1.5rem' }}></div>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="delivery-success-wrapper">
            <div className="success-checkmark">✓</div>
            <h2>Well Done!</h2>
            <p className="text-muted">Order <strong>{selectedOrder?.orderId}</strong> has been marked as delivered.</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary btn-full" onClick={() => window.print()}>🖨️ Print Receipt</button>
              <button className="btn btn-ghost btn-full" onClick={() => setOrderModalOpen(false)}>Close</button>
            </div>
          </div>
        ) : selectedOrder ? (
          <div className="order-modal-content">
            <div className="print-only receipt-heading">
              <h1 style={{ color: 'var(--clr-green)' }}>SustainX Waste Management</h1>
              <p>Official Delivery Receipt - {selectedOrder.orderId}</p>
            </div>

            {/* Status Tracker */}
            <div className="order-status-tracker">
              {['pending', 'approved', 'ready_for_pickup', 'delivered'].map((s, i) => {
                const statuses = ['pending', 'approved', 'ready_for_pickup', 'delivered'];
                const currentIdx = statuses.indexOf(selectedOrder.status);
                const isCompleted = i < currentIdx || selectedOrder.status === 'delivered';
                const isActive = selectedOrder.status === s;
                return (
                  <div key={s} className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="step-dot">{isCompleted ? '✓' : i + 1}</div>
                    <div className="step-text">{s.replace(/_/g, ' ')}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-muted, rgba(0,0,0,.03))', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '2.5rem' }}>📦</div>
                <div>
                  <div className="info-label">Item Ordered</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedOrder.itemName}</div>
                </div>
              </div>
              <div>
                <div className="info-label">👤 Customer</div>
                <div style={{ fontWeight: 700 }}>{selectedOrder.user?.name || 'Unknown'}</div>
                <div style={{ fontSize: '.85rem', color: 'var(--txt-secondary)', fontWeight: 500 }}>{selectedOrder.user?.email || 'N/A'}</div>
              </div>
              <div>
                <div className="info-label">🆔 User ID</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-navy)' }}>{selectedOrder.user?.email || selectedOrder.userName || '—'}</div>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div className="info-label">📍 Pickup Location</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.pickupLocation}</div>
              </div>
              <div>
                <div className="info-label">🕒 Pickup Time</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.pickupTime}</div>
              </div>
            </div>

            {selectedOrder.status === 'delivered' && (
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-muted, rgba(0,0,0,.02))', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div className="info-label" style={{ marginBottom: '.3rem' }}>🔐 Verified Pickup Code</div>
                <div className="pickup-code" style={{ fontSize: '1.4rem' }}>{selectedOrder.pickupCode || 'VERIFIED'}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--clr-green)', fontWeight: 700, marginTop: '.4rem' }}>✓ IDENTITY VERIFIED</div>
              </div>
            )}

            {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'ready_for_pickup' && (
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-muted, rgba(0,0,0,.02))', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--txt-muted)' }}>
                  Pickup details will be available once the order is <strong>Ready for Pickup</strong>.
                </p>
              </div>
            )}

            {/* Delivery Verification Input */}
            {selectedOrder.status === 'ready_for_pickup' && (
              <div className="verification-box">
                <div style={{ fontWeight: 700, color: 'var(--clr-amber)', fontSize: '.9rem' }}>⚠️ Delivery Verification Required</div>
                <p className="text-muted" style={{ fontSize: '.8rem' }}>Enter the student's pickup code.</p>
                <input 
                  type="text" 
                  className="verification-input" 
                  placeholder="X7K9P2"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  disabled={selectedOrder.failedAttempts >= 3}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              {selectedOrder.status === 'ready_for_pickup' && (
                <button 
                  className={`btn btn-primary btn-full ${selectedOrder.failedAttempts >= 3 ? 'btn-disabled' : ''}`}
                  disabled={selectedOrder.failedAttempts >= 3}
                  onClick={() => handleOrderStatus(selectedOrder.orderId, 'delivered', verificationCode)}
                >
                  🚚 Confirm & Deliver
                </button>
              )}
              {selectedOrder.status === 'approved' && (
                <button 
                  className="btn btn-amber btn-full" 
                  onClick={() => handleOrderStatus(selectedOrder.orderId, 'ready_for_pickup')}
                >
                  🎁 Ready for Pickup
                </button>
              )}
              {selectedOrder.status === 'pending' && (
                <button 
                  className="btn btn-blue btn-full" 
                  onClick={() => handleOrderStatus(selectedOrder.orderId, 'approved')}
                >
                  👍 Approve Order
                </button>
              )}
              <div style={{ display: 'flex', gap: '.5rem', flex: 1 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setOrderModalOpen(false)}>Close</button>
                {selectedOrder.status === 'delivered' && (
                  <button className="btn btn-ghost" onClick={() => window.print()}>🖨️ Receipt</button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
