import AppTile from '../components/AppTile.jsx'
import { APPS } from '../config/apps.js'

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <h1>Welcome to the Daikin Supplier Portal</h1>
        <p>Choose an application to get started.</p>
      </section>
      <section className="tile-grid">
        {APPS.map((app) => (
          <AppTile key={app.id} app={app} />
        ))}
      </section>
    </>
  )
}
