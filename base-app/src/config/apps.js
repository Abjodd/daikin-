// Single source of truth for the tiles on the landing page.
// URLs come from .env (VITE_*), with localhost defaults for development.
export const APPS = [
  {
    id: 'advance-shipment-notes',
    name: 'Advance Shipment Notes',
    short: 'ASN',
    description: 'Create and track advance shipment notifications sent to Daikin plants.',
    color: '#0a7cc2',
    url: import.meta.env.VITE_ASN_URL || 'http://localhost:5174',
  },
  {
    id: 'schedule-release',
    name: 'Schedule Release',
    short: 'SR',
    description: 'View delivery schedules released against purchase orders.',
    color: '#0f9d76',
    url: import.meta.env.VITE_SCHEDULE_RELEASE_URL || 'http://localhost:5175',
  },
  {
    id: 'purchase-order',
    name: 'Purchase Order',
    short: 'PO',
    description: 'Browse, acknowledge and track purchase orders.',
    color: '#d9822b',
    url: import.meta.env.VITE_PURCHASE_ORDER_URL || 'http://localhost:5176',
  },
]
