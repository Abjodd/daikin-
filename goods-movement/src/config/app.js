export const APP_NAME = 'Goods Movement'
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173'

export function getAsnAppUrl(asnId) {
  const cleanAsn = String(asnId || '').trim()
  const query = cleanAsn ? `?asn=${encodeURIComponent(cleanAsn)}` : ''

  if (import.meta.env.VITE_ASN_URL) {
    const base = import.meta.env.VITE_ASN_URL.replace(/\/+$/, '')
    return `${base}/${query}`
  }

  if (import.meta.env.PROD) {
    const { origin, hostname } = window.location
    if (hostname.includes('-gm-approuter.')) {
      const asnOrigin = origin.replace('-gm-approuter.', '-asn-approuter.')
      return `${asnOrigin}/asnui/${query}`
    }
    return `/asnui/${query}`
  }

  const { protocol, hostname } = window.location
  if (/^port\d+-/.test(hostname)) {
    return `${protocol}//${hostname.replace(/^port\d+-/, 'port5174-')}/${query}`
  }

  return `http://localhost:5174/${query}`
}
