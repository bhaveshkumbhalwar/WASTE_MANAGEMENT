import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from './NotificationBell';

export default function Topbar({ title, onToggleMenu }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      );
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <button className="menu-toggle" onClick={onToggleMenu}>☰</button>
        <h2 className="topbar-title">{title}</h2>
      </div>
      <div className="topbar-actions">
        <span className="topbar-time">
          🕐 {time}
        </span>
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
