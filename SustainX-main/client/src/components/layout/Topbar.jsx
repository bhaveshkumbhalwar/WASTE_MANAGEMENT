import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';

export default function Topbar({ title }) {
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
      <h2>{title}</h2>
      <div className="topbar-actions">
        <span style={{ fontSize: '.78rem', color: 'var(--txt-muted)' }}>
          🕐 {time}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
