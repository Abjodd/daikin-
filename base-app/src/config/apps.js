// Single source of truth for the tiles on the landing page.
//
// Where does each tile link to?
//   1. If a URL is set → that URL.
//        deployed build (npm run build) reads base-app/.env.production
//        local dev (npm run dev) reads base-app/.env, if you create one
//   2. Deployed build with no URL → '' (tile shows "Not deployed yet")
//   3. Local dev with no URL → worked out from where the portal itself is running:
//        • laptop  → http://localhost:5174 …
//        • SAP BAS → https://port5174-workspaces-ws-xxxx.<region>.applicationstudio.cloud.sap
//          (BAS gives every port its own address, so "localhost" would open on YOUR
//           computer instead of BAS)
export function appUrl(envUrl, port, path = '/') {
  if (envUrl) return envUrl
  if (import.meta.env.PROD) return '' // deployed, but no link set in .env.production

  const { protocol, hostname } = window.location

  // SAP Business Application Studio: port5173-workspaces-… → port5174-workspaces-…
  if (/^port\d+-/.test(hostname)) {
    return `${protocol}//${hostname.replace(/^port\d+-/, `port${port}-`)}${path}`
  }

  // Laptop (localhost or a LAN IP)
  return `${protocol}//${hostname}:${port}${path}`
}

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
    url: appUrl(import.meta.env.VITE_ASN_URL, 5174),
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
    url: appUrl(import.meta.env.VITE_SCHEDULE_RELEASE_URL, 5175),
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
    url: appUrl(import.meta.env.VITE_PURCHASE_ORDER_URL, 5176),
  },
]
