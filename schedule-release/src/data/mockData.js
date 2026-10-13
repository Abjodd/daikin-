// Sample data — replace with API calls in src/services/api.js
export const ROW_KEY = 'releaseId'

export const COLUMNS = [
  {
    "label": "Release ID",
    "key": "releaseId"
  },
  {
    "label": "PO Number",
    "key": "poNumber"
  },
  {
    "label": "Part No.",
    "key": "partNumber"
  },
  {
    "label": "Delivery Date",
    "key": "deliveryDate"
  },
  {
    "label": "Qty",
    "key": "quantity"
  },
  {
    "label": "Status",
    "key": "status"
  }
]

export const ROWS = [
  {
    "releaseId": "SR-1101",
    "poNumber": "PO-450012",
    "partNumber": "CMP-2210",
    "deliveryDate": "2026-10-15",
    "quantity": 500,
    "status": "Released"
  },
  {
    "releaseId": "SR-1102",
    "poNumber": "PO-450012",
    "partNumber": "CMP-2210",
    "deliveryDate": "2026-10-22",
    "quantity": 500,
    "status": "Planned"
  },
  {
    "releaseId": "SR-1103",
    "poNumber": "PO-450015",
    "partNumber": "FAN-0391",
    "deliveryDate": "2026-10-18",
    "quantity": 1200,
    "status": "Released"
  },
  {
    "releaseId": "SR-1104",
    "poNumber": "PO-450019",
    "partNumber": "COIL-7782",
    "deliveryDate": "2026-10-25",
    "quantity": 300,
    "status": "Planned"
  },
  {
    "releaseId": "SR-1105",
    "poNumber": "PO-450021",
    "partNumber": "PCB-1150",
    "deliveryDate": "2026-10-09",
    "quantity": 900,
    "status": "Closed"
  }
]
