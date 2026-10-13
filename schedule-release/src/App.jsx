import Header from './components/Header.jsx'
import ListPage from './pages/ListPage.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main className="container main">
        <ListPage />
      </main>
    </>
  )
}
