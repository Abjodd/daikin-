// ═══════════════════════════════════════════════════════════════
// MOCK BACKEND — shared in-memory store for Schedule Release + Create ASN
// Replaces the SAP OData service. Data lives only in memory, so a full
// page refresh resets everything. Dates are generated relative to "today"
// so the default 40-day window in the Confirm view always shows rows.
// ═══════════════════════════════════════════════════════════════

const pad = (n) => String(n).padStart(2, '0')

export const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// today + N days → SAP style 'YYYYMMDD'
export const sapOffset = (days) => {
  const d = startOfToday()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYYMMDD' → 'Oct 22, 2026'
export const sapDateDisplay = (v) => {
  const s = String(v ?? '').trim()
  if (s.length !== 8) return s
  const mi = parseInt(s.slice(4, 6), 10) - 1
  if (mi < 0 || mi > 11) return s
  return `${MONTHS[mi]} ${s.slice(6, 8)}, ${s.slice(0, 4)}`
}

// Stand-in for the logged-in supplier (used when role = partner)
export const MOCK_VENDOR_NO = 'FS859'

export const SUPPLIERS = [
  { lifnr: 'FS859', name: 'Apex Auto Components Pvt Ltd' },
  { lifnr: 'FS102', name: 'Sunrise Plastics Ltd' },
  { lifnr: 'FS377', name: 'Kaveri Metal Works' },
  { lifnr: 'FS410', name: 'Orbit Wiring Systems' },
]

export const PDIR_REF_NOS = ['PDIR-2026-0101', 'PDIR-2026-0102', 'PDIR-2026-0103']

// ── Seed data ──────────────────────────────────────────────────
const OFFSETS = [1, 2, 3, 5, 6, 8, 9, 12, 15, 19, 22, 26]

// First `confirmedCount` lines are confirmed (confkey 'X'), the rest are pending.
const makeLines = (baseQty, confirmedCount, offsets = OFFSETS) =>
  offsets.map((off, i) => {
    const qty = baseQty * (1 + (i % 3))
    const done = i < confirmedCount
    return {
      schLineNo: String(i + 1).padStart(4, '0'),
      date: sapOffset(off),
      qty,
      confirmedQty: done ? qty : 0,
      confkey: done ? 'X' : '',
      asnCreated: 0,
    }
  })

const makeItem = (itemNo, materialNumber, materialName, hsnCode, storageLocation, uom, unitPrice, lines, spq = 10) => ({
  itemNo, materialNumber, materialName, hsnCode, storageLocation, uom, unitPrice, spq, lines,
})

export const AGREEMENTS = [
  {
    id: '5500012345', plant: '1001', plantName: 'Pune Plant',
    vendorNo: 'FS859', vendor: 'Apex Auto Components Pvt Ltd',
    type: 'Manual', date: sapOffset(-14),
    items: [
      makeItem('00010', 'RM-100234', 'Front Bumper Bracket', '73181500', 'SL01', 'NOS', 184.5, makeLines(100, 0)),
      makeItem('00020', 'RM-100871', 'Door Hinge Assembly', '83021090', 'SL01', 'NOS', 92.25, makeLines(250, 5), 25),
      makeItem('00030', 'RM-101455', 'Rear Lamp Housing', '87141090', 'SL02', 'NOS', 310, makeLines(60, 12), 5),
    ],
  },
  {
    id: '5500012346', plant: '1002', plantName: 'Chennai Plant',
    vendorNo: 'FS859', vendor: 'Apex Auto Components Pvt Ltd',
    type: 'Auto', date: sapOffset(-9),
    items: [
      makeItem('00010', 'RM-200310', 'Steering Column Cover', '87089900', 'SL01', 'NOS', 421.75, makeLines(40, 8), 4),
      makeItem('00020', 'RM-200342', 'Wiper Motor Mount', '85011019', 'SL03', 'NOS', 138, makeLines(120, 3), 12),
    ],
  },
  {
    id: '5500012347', plant: '1001', plantName: 'Pune Plant',
    vendorNo: 'FS102', vendor: 'Sunrise Plastics Ltd',
    type: 'Manual', date: sapOffset(-6),
    items: [
      makeItem('00010', 'PL-300118', 'Dashboard Trim Panel', '39269099', 'SL02', 'NOS', 76.4, makeLines(500, 0), 50),
      makeItem('00020', 'PL-300205', 'Clip Retainer Small', '39269099', 'SL02', 'NOS', 2.8, makeLines(5000, 0), 500),
    ],
  },
  {
    id: '5500012348', plant: '1003', plantName: 'Gurugram Plant',
    vendorNo: 'FS102', vendor: 'Sunrise Plastics Ltd',
    type: 'Auto', date: sapOffset(-3),
    items: [
      makeItem('00010', 'PL-310440', 'Door Pocket Liner', '39269099', 'SL01', 'NOS', 54.9, makeLines(300, 12), 30),
    ],
  },
]

export const findAgreement = (id) => AGREEMENTS.find((a) => a.id === id)

// Status is derived from the schedule lines, same as the real backend does
export const statusOf = (item) => {
  const total = item.lines.length
  const done = item.lines.filter((l) => l.confkey === 'X').length
  if (done === 0) return 'Confirmation Required'
  if (done === total) return 'Confirmed'
  return 'Partially Confirmed'
}