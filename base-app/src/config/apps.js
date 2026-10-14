// Single source of truth for the tiles on the landing page.
// URLs come from .env (VITE_*), with localhost defaults for development.
export const APPS = [
  {
    id: 'advance-shipment-notes',
    name: 'Advance Shipment Notes',
    short: 'ASN',
    icon: 'truck',
    description: 'Create, print and track advance shipment notifications sent to Daikin plants.',
    color: '#0a6ed1',
    tint: '#e8f2fc',
    stat: { value: 12, label: 'in transit' },
    url: import.meta.env.VITE_ASN_URL || 'http://localhost:5174',
  },
  {
    id: 'schedule-release',
    name: 'Schedule Release',
    short: 'SR',
    icon: 'calendar',
    description: 'View delivery schedules released against your purchase orders and plan dispatch.',
    color: '#12a36d',
    tint: '#e7f6f0',
    stat: { value: 8, label: 'due this week' },
    url: import.meta.env.VITE_SCHEDULE_RELEASE_URL || 'http://localhost:5175',
  },
  {
    id: 'purchase-order',
    name: 'Purchase Order',
    short: 'PO',
    icon: 'document',
    description: 'Browse, acknowledge and track purchase orders issued by Daikin.',
    color: '#e08a1e',
    tint: '#fdf3e6',
    stat: { value: 5, label: 'awaiting ack' },
    url: import.meta.env.VITE_PURCHASE_ORDER_URL || 'http://localhost:5176',
  },
]
