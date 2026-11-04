// ───────────────────────────────────────────────────────────
// Helpers for the ABAP OData (V2) service + shared SAP utilities.
// Calls go to a RELATIVE path; on BTP the approuter forwards /sap/... to the
// "Supplier-Portal" destination, which adds the S/4 login.
// ───────────────────────────────────────────────────────────

export const SR_SERVICE = import.meta.env.VITE_SR_ODATA_SERVICE || '/sap/opu/odata/sap/ZSB_SCHEDULEAGREEMENT'

// Entity set for ZP_SCH_AGREEMENTType (key: Schagreement, Schagreementitem, Vendor, Material; field: Status)
export const ZP_SCH = 'ZP_SCH_AGREEMENT'

// Value written to Status on confirm. Change if ABAP expects something else ('X', 'C', ...)
export const CONFIRMED_STATUS = 'CONFIRMED'
const CONFIRMED_VALUES = [CONFIRMED_STATUS, 'X', 'C', 'CONFIRMED']

const pad = (n) => String(n).padStart(2, '0')

// ── READ ────────────────────────────────────────────────────
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
    url = d.__next || ''
  }
  return rows
}

// ── WRITE (CSRF + POST) ─────────────────────────────────────
let csrfCache = ''

async function fetchCsrf(force = false) {
  if (csrfCache && !force) return csrfCache
  const res = await fetch(`${SR_SERVICE}/`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-CSRF-Token': 'Fetch' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Could not fetch CSRF token: ${res.status}`)
  csrfCache = res.headers.get('x-csrf-token') || ''
  if (!csrfCache) throw new Error('CSRF token was not returned by SAP')
  return csrfCache
}

export async function odataPost(entitySet, body, retry = true) {
  const token = await fetchCsrf()
  const res = await fetch(`${SR_SERVICE}/${entitySet}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRF-Token': token,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  // Token expired → refetch once and retry
  if (res.status === 403 && retry) {
    csrfCache = ''
    await fetchCsrf(true)
    return odataPost(entitySet, body, false)
  }

  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { message: text } }

  if (!res.ok) {
    throw new Error(
      json?.error?.message?.value || json?.message || `SAP returned ${res.status} for POST ${entitySet}`,
    )
  }
  return json.d || json
}

// ── Confirmation status (item level, from ZP_SCH_AGREEMENT) ─
/** Returns Map<itemNumberAsInt, true> for items that are confirmed. Never throws. */
export async function fetchConfirmedItems(agreementId) {
  const confirmed = new Map()
  try {
    const rows = await odataGet(ZP_SCH, { filter: `Schagreement eq ${q(agreementId)}` })
    rows.forEach((r) => {
      if (CONFIRMED_VALUES.includes(str(r.Status).toUpperCase())) {
        confirmed.set(parseInt(r.Schagreementitem, 10), true)
      }
    })
  } catch (e) {
    console.warn(`[SAP] Could not read ${ZP_SCH} (items shown as unconfirmed):`, e.message)
  }
  return confirmed
}

// ── Converters ──────────────────────────────────────────────
/** OData quote-escaping for $filter values */
export const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`

/** Any SAP date ("/Date(…)/", "2026-11-02T00:00:00", "20261102") → "YYYYMMDD" ('' if empty) */
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

export const num = (v) => {
  const n = parseFloat(String(v ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

export const str = (v) => String(v ?? '').trim()

/** Item numbers can arrive as "10" or "00010" — compare as numbers */
export const sameItem = (a, b) => parseInt(a, 10) === parseInt(b, 10)

/** Schagreementitem is MaxLength 4 → "00010" / "10" → "0010" */
export const item4 = (v) => String(parseInt(v, 10) || 0).padStart(4, '0')