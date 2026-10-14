import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import Icon from './Icons.jsx'

const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user" ref={ref}>
      <button className="icon-btn" aria-label="Notifications">
        <Icon name="bell" />
        <span className="dot" />
      </button>

      <button className="user-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar">{initials(user.name)}</span>
        <span className="user-text">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
        </span>
        <Icon name="chevronDown" size={16} className={`chev ${open ? 'chev--open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu" role="menu">
          <div className="user-menu-head">
            <span className="avatar avatar--lg">{initials(user.name)}</span>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <dl className="user-meta">
            <div><dt>Role</dt><dd>{user.role}</dd></div>
            <div><dt>Supplier code</dt><dd>{user.supplierCode}</dd></div>
            <div><dt>Plant</dt><dd>{user.plant}</dd></div>
          </dl>
          <button className="user-menu-item" onClick={() => setOpen(false)}>
            <Icon name="user" size={18} /> My profile
          </button>
          <button className="user-menu-item user-menu-item--danger" onClick={logout}>
            <Icon name="logout" size={18} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
