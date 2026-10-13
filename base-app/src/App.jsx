import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  return (
    <div className="layout">
      <Header />
      <main className="container">
        <LandingPage />
      </main>
      <Footer />
    </div>
  )
}
