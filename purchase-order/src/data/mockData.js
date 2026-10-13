// Sample data — replace with API calls in src/services/api.js
export const ROW_KEY = 'poNumber'

export const COLUMNS = [
  {
    "label": "PO Number",
    "key": "poNumber"
  },
  {
    "label": "Supplier",
    "key": "supplier"
  },
  {
    "label": "PO Date",
    "key": "poDate"
  },
  {
    "label": "Items",
    "key": "items"
  },
  {
    "label": "Value (₹)",
    "key": "value"
  },
  {
    "label": "Status",
    "key": "status"
  }
]

export const ROWS = [
  {
    "poNumber": "PO-450012",
    "supplier": "Bharat Metals",
    "poDate": "2026-09-28",
    "items": 4,
    "value": 1250000,
    "status": "Acknowledged"
  },
  {
    "poNumber": "PO-450015",
    "supplier": "Sri Ram Plastics",
    "poDate": "2026-09-30",
    "items": 2,
    "value": 480000,
    "status": "Open"
  },
  {
    "poNumber": "PO-450019",
    "supplier": "Precision Coils Ltd",
    "poDate": "2026-10-02",
    "items": 6,
    "value": 2310000,
    "status": "Open"
  },
  {
    "poNumber": "PO-450021",
    "supplier": "Bharat Metals",
    "poDate": "2026-10-05",
    "items": 3,
    "value": 905000,
    "status": "Closed"
  },
  {
    "poNumber": "PO-450024",
    "supplier": "Neel Electricals",
    "poDate": "2026-10-08",
    "items": 1,
    "value": 150000,
    "status": "Cancelled"
  }
]
