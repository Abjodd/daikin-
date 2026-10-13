import StatusBadge from './StatusBadge.jsx'

const format = (key, value) =>
  key === 'value' ? Number(value).toLocaleString('en-IN') : value

export default function DataTable({ columns, rows, rowKey }) {
  if (rows.length === 0) return <p className="empty">No records found.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.key === 'status' ? <StatusBadge status={row.status} /> : format(c.key, row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
