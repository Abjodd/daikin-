import Icon from './Icons.jsx'
import UserMenu from './UserMenu.jsx'

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'applications', label: 'Applications', icon: 'grid' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'support', label: 'Support', icon: 'help' },
]

export default function Navbar({ active, onNavigate }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <a href="#overview" className="brand" onClick={(e) => { e.preventDefault(); onNavigate('overview') }}>
          <span className="wordmark">DAIKIN</span>
          <span className="brand-sub">Supplier Portal</span>
        </a>

        {/* Pill-shaped navigation */}
        <nav className="pill-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`pill ${active === item.id ? 'pill--active' : ''}`}
              aria-label={item.label}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                onNavigate(item.id)
              }}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <UserMenu />
      </div>
    </header>
  )
}
