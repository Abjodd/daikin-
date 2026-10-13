export default function AppTile({ app }) {
  return (
    <a className="tile" href={app.url} style={{ '--accent': app.color }}>
      <span className="tile-badge">{app.short}</span>
      <h2 className="tile-name">{app.name}</h2>
      <p className="tile-desc">{app.description}</p>
      <span className="tile-cta">Open app →</span>
    </a>
  )
}
