import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/api';
import NotificationItem from './NotificationItem';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      // Only update if data changed to avoid unnecessary renders
      setNotifications(res.data);
      return res.data;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 seconds for immediate updates
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);
    
    if (nextOpenState) {
      // Refresh list and get fresh data
      const freshNotifications = await fetchNotifications();
      const freshUnreadCount = freshNotifications.filter(n => !n.isRead).length;
      
      // If there are unread, mark all as read
      if (freshUnreadCount > 0) {
        try {
          await markAllNotificationsRead();
          // Optimistically update local state
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
          console.error('Error marking all as read:', err);
        }
      }
    }
  };

  const handleMarkRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification._id);
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`} onClick={handleToggle} aria-label="Notifications">
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="bell-badge">
            <span className="bell-dot"></span>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Notifications</h3>
                {unreadCount > 0 && <span className="unread-label">{unreadCount} New</span>}
              </div>
              <small style={{ fontSize: '.65rem', color: 'var(--txt-muted)', fontWeight: 500 }}>
                Stay updated with your latest activities
              </small>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', padding: '3rem 1rem' }}>
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No notifications yet</div>
                <div className="empty-state-desc">Your alerts and updates will appear here when they arrive.</div>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem 
                  key={n._id} 
                  notification={n} 
                  onClick={handleMarkRead}
                />
              ))
            )}
          </div>
          <div className="notification-footer">
            <button onClick={() => setIsOpen(false)}>Close Notifications</button>
          </div>
        </div>
      )}
    </div>
  );
}
