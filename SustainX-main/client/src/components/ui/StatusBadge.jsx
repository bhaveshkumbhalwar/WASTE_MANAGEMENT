export default function StatusBadge({ status }) {
  const map = {
    pending: ['badge-pending', 'dot-pending', '⏳ Pending'],
    'in-progress': ['badge-progress', 'dot-progress', '🔄 In Progress'],
    completed: ['badge-done', 'dot-done', '✅ Completed'],
    rejected: ['badge-rejected', 'dot-rejected', '❌ Rejected'],
    ready: ['badge-ready', 'dot-ready', '🎁 Ready'],
  };
  const [cls, dot, label] = map[status] || ['badge-pending', 'dot-pending', status];
  return (
    <span className={`badge ${cls}`}>
      <span className={`status-dot ${dot}`}></span>
      {label}
    </span>
  );
}
