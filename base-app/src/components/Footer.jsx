export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} Daikin · Supplier Portal</span>
        <span className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#support">Support</a>
        </span>
      </div>
    </footer>
  )
}
