export default function StatCard({ icon, value, label, borderColor }) {
  return (
    <div
      className="stat-card"
      style={borderColor ? { borderTop: `4px solid ${borderColor}` } : {}}
    >
      <div className="stat-icon-wrapper">
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
