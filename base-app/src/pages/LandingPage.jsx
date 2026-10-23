import { useEffect, useState } from 'react'
import Navbar, { NAV_ITEMS } from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import AppTile from '../components/AppTile.jsx'
import Icon from '../components/Icons.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { APPS } from '../config/apps.js'
import { KPIS, ACTIVITY, ANNOUNCEMENTS } from '../data/dashboard.js'
import '../styles/landing.css'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function LandingPage() {
  const { user } = useAuth()
  const [active, setActive] = useState('overview')
  const firstName = user.name.split(' ')[0]
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Highlight the pill for whichever section is on screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function navigate(id) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
      <Navbar active={active} onNavigate={navigate} />

      <main className="container main">
        {/* ── Hero ── */}
        <section id="overview" className="hero">
          <div className="hero-copy">
            <span className="hero-date">
              <Icon name="clock" size={15} /> {today}
            </span>
            <h1>
              {greeting()}, {firstName} 👋
            </h1>
            <p>Here's what's happening across your supply chain today.</p>
            <div className="hero-chips">
              <span className="chip">{user.supplierCode}</span>
              <span className="chip">{user.plant}</span>
              <span className="chip chip--ok">
                <span className="live" /> All systems operational
              </span>
            </div>
          </div>
          <div className="hero-cta">
            {APPS[0].url && (
              <a className="btn-light" href={APPS[0].url}>
                <Icon name="truck" size={18} /> Create ASN
              </a>
            )}
            {APPS[2].url && (
              <a className="btn-ghost" href={APPS[2].url}>
                View purchase orders
              </a>
            )}
          </div>
        </section>

        {/* ── KPIs ── */}
        <section className="kpis" aria-label="Key figures">
          {KPIS.map((k) => (
            <div className="kpi" key={k.label}>
              <span className="kpi-icon">
                <Icon name={k.icon} size={20} />
              </span>
              <div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
                <div className={`kpi-change kpi-change--${k.trend}`}>{k.change}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Applications ── */}
        <section id="applications" className="section">
          <div className="section-head">
            <div>
              <h2>Applications</h2>
              <p>Jump straight into the tool you need.</p>
            </div>
            <span className="count-pill">{APPS.length} apps</span>
          </div>
          <div className="tile-grid">
            {APPS.map((app) => (
              <AppTile key={app.id} app={app} />
            ))}
          </div>
        </section>

        {/* ── Activity + announcements ── */}
        <section id="activity" className="section split">
          <div className="panel">
            <div className="panel-head">
              <h2>Recent activity</h2>
              <button className="link-btn">View all</button>
            </div>
            <ul className="feed">
              {ACTIVITY.map((a) => (
                <li key={a.id} className="feed-item">
                  <span className="feed-tag" style={{ '--c': a.color }}>
                    {a.app}
                  </span>
                  <div className="feed-body">
                    <div className="feed-title">{a.title}</div>
                    <div className="feed-meta">{a.meta}</div>
                  </div>
                  <span className="feed-time">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Announcements</h2>
            </div>
            <ul className="notes">
              {ANNOUNCEMENTS.map((n) => (
                <li key={n.id} className="note">
                  <span className="note-tag">{n.tag}</span>
                  <div className="note-title">{n.title}</div>
                  <p>{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Support ── */}
        <section id="support" className="section support">
          <div>
            <h2>Need help?</h2>
            <p>Our supplier desk is available Mon–Sat, 9:00 AM – 6:00 PM IST.</p>
          </div>
          <div className="support-actions">
            <a className="btn-outline" href="mailto:supplier.support@daikin.com">
              <Icon name="mail" size={18} /> Email support
            </a>
            <a className="btn-outline" href="#support" onClick={(e) => e.preventDefault()}>
              <Icon name="help" size={18} /> User guide
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
