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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <h3>Notifications</h3>
                <span className="notification-count-tag">{notifications.length} total</span>
              </div>
              <small style={{ fontSize: '.6rem', opacity: 0.4 }}>Current UID: {user?._id || user?.id || 'Unknown'}</small>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                <p>No notifications yet</p>
                <small style={{ opacity: 0.6 }}>Your alerts will appear here</small>
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
            <button onClick={() => setIsOpen(false)}>Close Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
