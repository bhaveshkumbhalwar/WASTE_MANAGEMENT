import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/api';
import NotificationItem from './NotificationItem';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      console.log(`🔔 [UI] Received ${res.data.length} notifications`);
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchNotifications, 30000);
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
      // Refresh list
      await fetchNotifications();
      
      // If there are unread, mark all as read
      if (unreadCount > 0) {
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
      <button className="bell-btn" onClick={handleToggle} aria-label="Notifications">
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="unread-label">{unreadCount} unread</span>}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
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
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
