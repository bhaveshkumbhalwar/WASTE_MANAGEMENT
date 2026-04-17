export default function StatusBadge({ status }) {
  const map = {
    pending: ['badge-pending', 'dot-pending', '⏳ Pending'],
    'in-progress': ['badge-progress', 'dot-progress', '🔄 In Progress'],
    completed: ['badge-done', 'dot-done', '✅ Completed'],
  };
  const [cls, dot, label] = map[status] || ['badge-pending', 'dot-pending', status];
  return (
    <span className={`badge ${cls}`}>
      <span className={`status-dot ${dot}`}></span>
      {label}
    </span>
  );
}
