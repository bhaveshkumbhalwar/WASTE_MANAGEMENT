import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';

export default function Sidebar({ portalName, icon, navItems, activeSection, onNavigate, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name);

  const handleNavClick = (sectionId) => {
    onNavigate(sectionId);
    if (onClose) onClose(); // Auto-close on mobile after navigation
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">{icon}</div>
          <div className="logo-text">
            SustainX
            <div className="logo-sub">{portalName}</div>
          </div>
          {/* Close button only visible on mobile via CSS if needed, or always here for simplicity */}
          <button className="menu-toggle" onClick={onClose} style={{ marginLeft: 'auto', fontSize: '1.2rem' }}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">MENU</div>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              data-section={item.id}
              data-label={item.label}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-username">{user?.name}</div>
              <div className="sidebar-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full mt-1" onClick={logout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
