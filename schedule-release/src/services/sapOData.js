// ───────────────────────────────────────────────────────────
// Small helper for reading the ABAP OData (V2) service.
//
// Calls go to a RELATIVE path (/sap/opu/odata/...). On BTP the approuter
// forwards /sap/... to the "Supplier-Portal" destination (see
// approuter/xs-app.json), which adds the S/4 login — so no credentials
// ever live in this code.
// ───────────────────────────────────────────────────────────

// Service binding that exposes ZCDS_SCHDULEAGR_HEAD / _ITEM / ZCDS_SCHEDULEAGR_SCH.
// If the ABAP team put these views in their own binding, change it here
// (or set VITE_SR_ODATA_SERVICE in .env / .env.production).
export const SR_SERVICE ='/sap/opu/odata/sap/ZSB_SCHEDULEAGREEMENT'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Read an entity set. Follows server-side paging (__next) automatically.
 *   odataGet('ZCDS_SCHDULEAGR_ITEM', { filter: "SchedulingAgreement eq '5500000001'", select: 'Material,Plant' })
 */
export async function odataGet(entitySet, { filter = '', select = '', orderby = '' } = {}) {
  const params = ['$format=json']
  if (filter) params.push(`$filter=${encodeURIComponent(filter)}`)
  if (select) params.push(`$select=${encodeURIComponent(select)}`)
  if (orderby) params.push(`$orderby=${encodeURIComponent(orderby)}`)

  let url = `${SR_SERVICE}/${entitySet}?${params.join('&')}`
  const rows = []

  while (url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'include' })
    const type = res.headers.get('content-type') || ''

    if (type.includes('text/html')) {
      throw new Error(
        import.meta.env.DEV
          ? 'The SAP service is not available in local dev. Run with mock data (default), or use the deployed app.'
          : 'Your SAP session has expired — please reload the page to sign in again.',
      )
    }
    if (!res.ok) {
      const hint = res.status === 404 ? ` — check that ${entitySet} is exposed in ${SR_SERVICE}` : ''
      throw new Error(`SAP returned ${res.status} for ${entitySet}${hint}`)
    }

    const json = await res.json()
    const d = json.d || {}
    rows.push(...(d.results || (Array.isArray(d) ? d : [d])))
    url = d.__next || '' // server-side paging
  }
  return rows
}

/** OData quote-escaping for $filter values */
export const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`

/** Any SAP date ("/Date(1730505600000)/", "2026-11-02T00:00:00", "20261102") → "YYYYMMDD" ('' if empty) */
export function toSap8(v) {
  if (!v) return ''
  const s = String(v).trim()
  const ms = s.match(/\/Date\((-?\d+)/)
  if (ms) {
    const d = new Date(Number(ms[1]))
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
  }
  if (/^\d{8}$/.test(s)) return s === '00000000' ? '' : s
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return iso ? `${iso[1]}${iso[2]}${iso[3]}` : ''
}

/** "1500.000" → 1500 */
export const num = (v) => {
  const n = parseFloat(String(v ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

/** Trim + string */
export const str = (v) => String(v ?? '').trim()

/** Item numbers can arrive as "10" or "00010" — compare them as numbers */
export const sameItem = (a, b) => parseInt(a, 10) === parseInt(b, 10)
