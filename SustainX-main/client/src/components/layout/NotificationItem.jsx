import { fmtDate } from '../../utils/helpers';

export default function NotificationItem({ notification, onClick }) {
  const getIcon = (type) => {
    switch (type) {
      case 'complaint': return '📝';
      case 'reward': return '✨';
      case 'user': return '👤';
      case 'iot': return '📡';
      default: return '🔔';
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'complaint': return 'badge-blue';
      case 'reward': return 'badge-amber';
      case 'user': return 'badge-pending';
      case 'iot': return 'badge-red';
      default: return 'badge-ghost';
    }
  };

  return (
    <div 
      className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
      onClick={() => onClick(notification)}
    >
      <div className={`notification-icon-circle ${getBadgeClass(notification.type)}`}>
        <span style={{ fontSize: '1.2rem' }}>{getIcon(notification.type)}</span>
      </div>
      <div className="notification-content">
        <p className="notification-message" style={{ fontWeight: notification.isRead ? 400 : 600 }}>
          {notification.message}
        </p>
        <span className="notification-time">🕒 {fmtDate(notification.createdAt)}</span>
      </div>
      {!notification.isRead && <div className="unread-dot"></div>}
    </div>
  );
}
