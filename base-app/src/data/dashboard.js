// Sample dashboard data — replace with API calls when the backend is ready.
export const KPIS = [
  { label: 'Open Purchase Orders', value: '24', change: '+3 this week', trend: 'up', icon: 'document' },
  { label: 'ASNs In Transit', value: '12', change: '4 arriving today', trend: 'flat', icon: 'truck' },
  { label: 'Releases Due', value: '8', change: 'Next: 15 Oct', trend: 'flat', icon: 'calendar' },
  { label: 'On-time Delivery', value: '96.4%', change: '+1.2% vs last month', trend: 'up', icon: 'check' },
]

export const ACTIVITY = [
  { id: 1, app: 'ASN', color: '#0a6ed1', title: 'ASN-24004 dispatched', meta: 'PO-450021 · 2,000 units', time: '10 min ago' },
  { id: 2, app: 'PO', color: '#e08a1e', title: 'PO-450024 issued', meta: 'Neel Electricals · ₹1,50,000', time: '1 hr ago' },
  { id: 3, app: 'SR', color: '#12a36d', title: 'Schedule SR-1103 released', meta: 'FAN-0391 · due 18 Oct', time: '3 hrs ago' },
  { id: 4, app: 'ASN', color: '#0a6ed1', title: 'ASN-24002 delivered', meta: 'Sri City Plant · GRN pending', time: 'Yesterday' },
  { id: 5, app: 'PO', color: '#e08a1e', title: 'PO-450012 acknowledged', meta: 'Bharat Metals', time: 'Yesterday' },
]

export const ANNOUNCEMENTS = [
  { id: 1, tag: 'Notice', title: 'Plant holiday on 20 Oct (Diwali)', body: 'No inbound receipts at Neemrana. Plan dispatches accordingly.' },
  { id: 2, tag: 'Update', title: 'Barcode labels now mandatory on ASN', body: 'Print labels from the ASN app before dispatch.' },
]
