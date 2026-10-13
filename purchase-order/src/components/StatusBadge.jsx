const STATUS_CONFIG = {
  'Confirmation Required': { bg: '#fff3e0', text: '#e65100', dot: '#ff9800', label: 'Confirmation Required' },
  'Partially Confirmed':   { bg: '#e3f2fd', text: '#1565c0', dot: '#1976d2', label: 'Partially Confirmed'   },
  'Confirmed':             { bg: '#e8f5e9', text: '#2e7d32', dot: '#43a047', label: 'Confirmed'             },
  'Completed':             { bg: '#f3e5f5', text: '#6a1b9a', dot: '#8e24aa', label: 'Completed'             },
  'Open':                  { bg: '#fff3e0', text: '#e65100', dot: '#ff9800', label: 'Open'                  },
  'In Transit':            { bg: '#e3f2fd', text: '#0a7cc2', dot: '#0a7cc2', label: 'In Transit'            },
  'Delivered':             { bg: '#e8f5e9', text: '#2e7d32', dot: '#43a047', label: 'Delivered'             },
  'Draft':                 { bg: '#f5f5f5', text: '#616161', dot: '#9e9e9e', label: 'Draft'                 },
  'Cancelled':             { bg: '#fce8e6', text: '#cc1c14', dot: '#cc1c14', label: 'Cancelled'             },
}

const getStatus = (s) =>
  STATUS_CONFIG[s] || { bg: '#f5f5f5', text: '#616161', dot: '#9e9e9e', label: s || 'Unknown' }

export default function StatusBadge({ status }) {
  const cfg = getStatus(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
