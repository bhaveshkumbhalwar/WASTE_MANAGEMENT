export default function StatCard({ icon, value, label, borderColor }) {
  return (
    <div
      className="stat-card"
      style={borderColor ? { borderTop: `3px solid ${borderColor}` } : {}}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
