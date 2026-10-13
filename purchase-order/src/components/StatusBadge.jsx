const COLORS = {
  'In Transit': '#0a7cc2', Delivered: '#0f9d76', Draft: '#7a8594',
  Released: '#0f9d76', Planned: '#0a7cc2', Closed: '#7a8594',
  Open: '#d9822b', Acknowledged: '#0f9d76', Cancelled: '#c0392b',
}

export default function StatusBadge({ status }) {
  const color = COLORS[status] || '#7a8594'
  return (
    <span className="badge" style={{ color, borderColor: color }}>
      {status}
    </span>
  )
}
