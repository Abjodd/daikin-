export default function SummaryCards({ rows }) {
  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  return (
    <div className="cards">
      <div className="card">
        <span className="card-label">Total</span>
        <span className="card-value">{rows.length}</span>
      </div>
      {Object.entries(counts).map(([status, n]) => (
        <div className="card" key={status}>
          <span className="card-label">{status}</span>
          <span className="card-value">{n}</span>
        </div>
      ))}
    </div>
  )
}
