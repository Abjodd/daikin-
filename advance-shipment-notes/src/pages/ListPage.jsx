import { useEffect, useMemo, useState } from 'react'
import SummaryCards from '../components/SummaryCards.jsx'
import DataTable from '../components/DataTable.jsx'
import { COLUMNS, ROW_KEY } from '../data/mockData.js'
import { getRecords } from '../services/api.js'
import { APP_NAME } from '../config/app.js'

export default function ListPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    getRecords().then(setRows)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
  }, [rows, query])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{APP_NAME}</h1>
          <p className="muted">Create and track advance shipment notifications sent to Daikin plants.</p>
        </div>
        <input
          className="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <SummaryCards rows={rows} />
      <DataTable columns={COLUMNS} rows={filtered} rowKey={ROW_KEY} />
    </>
  )
}
