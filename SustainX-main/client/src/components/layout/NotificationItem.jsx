import { fmtDate } from '../../utils/helpers';

export default function NotificationItem({ notification, onClick }) {
  const getIcon = (type) => {
    switch (type) {
      case 'complaint': return '📋';
      case 'reward': return '🏆';
      case 'user': return '👤';
      case 'iot': return '🚨';
      default: return '🔔';
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'complaint': return 'badge-blue';
      case 'reward': return 'badge-done';
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
        {getIcon(notification.type)}
      </div>
      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">{fmtDate(notification.createdAt)}</span>
      </div>
      {!notification.isRead && <div className="unread-dot"></div>}
    </div>
  );
}
