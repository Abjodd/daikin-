import { APP_NAME} from '../config/app.js'


export default function Header() {
  console.log('PORTAL_URL = ', import.meta.env.VITE_PORTAL_URL)
  return (
    <header className="header">
      <div className="container header-inner">
        <a className="logo" href={import.meta.env.VITE_PORTAL_URL}>DAIKIN</a>
        <span className="header-title">{APP_NAME}</span>
        <a className="back-link" href={import.meta.env.VITE_PORTAL_URL}>← Back to Portal</a>
      </div>
    </header>
  )
}
