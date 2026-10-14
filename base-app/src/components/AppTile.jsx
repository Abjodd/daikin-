import Icon from './Icons.jsx'

export default function AppTile({ app }) {
  return (
    <a className="tile" href={app.url} style={{ '--accent': app.color, '--tint': app.tint }}>
      <div className="tile-top">
        <span className="tile-icon">
          <Icon name={app.icon} size={26} />
        </span>
        <span className="tile-code">{app.short}</span>
      </div>
      <h3 className="tile-name">{app.name}</h3>
      <p className="tile-desc">{app.description}</p>
      <div className="tile-foot">
        <span className="tile-stat">
          <strong>{app.stat.value}</strong> {app.stat.label}
        </span>
        <span className="tile-go" aria-hidden="true">
          <Icon name="arrowRight" size={18} />
        </span>
      </div>
    </a>
  )
}
