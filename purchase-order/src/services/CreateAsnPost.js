/**
 * Create ASN Post Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 *
 * Two separate actions share one HTTP handler (ZHTTP_ASN_CREATE):
 *   - postCreateAsn : Create ASN  -> head Type 'A',  invoice required, ASN number required
 *   - postConfirmPo : Confirm PO  -> head Type 'CP', no invoice,       ASN number optional
 */
export const USE_MOCK = false

const ODATA_BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'
const ASN_CREATE_URL = '/sap/bc/http/sap/ZHTTP_ASN_CREATE'

// Head Type expected by ZHTTP_ASN_CREATE for each action.
// Type and Status are required by ZHTTP_ASN_CREATE only. They are NOT properties of
// ZP_PUR_ASN_HEAD, so they are never sent in the OData POST (see buildAsnPayload / saveAsnToOData).
const ASN_TYPE_CREATE = 'A'
const ASN_TYPE_CONFIRM = 'CP'
const ASN_HEAD_STATUS = ''

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
})

const str = (v) => String(v ?? '').trim()
const qtyNum = (v) => parseFloat(v) || 0
const fmtQty = (n) => String(Number(Math.max(0, n).toFixed(3)))

function toSapDate(v) {
  if (!v) return ''
  const s = str(v)
  if (/^\d{8}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, '')
  const d = new Date(s)
  if (!isNaN(d)) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return ''
}

function toODataDate(v) {
  const s = toSapDate(v) // 'YYYYMMDD' or ''
  if (!s) return null
  return `/Date(${Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))})/`
}

/**
 * Builds the head payload (ZP_PUR_ASN_HEAD) and one item payload per selected row (ZP_PUR_ASN_ITEM).
 * Isdraft = 'X' for drafts. Issaved is NOT sent here: it is set only after all rows were saved
 * (see saveAsnToOData).
 */
export function buildAsnPayload({ poNo, invoice, selectedItems, header = {}, isDraft = false }) {
  const companyCode = str(header.companyCode || '1000')
  const supplierCode = str(header.vendorNo || header.vendor || '')
  const plant = str(header.plant || selectedItems[0]?.plant || '')

  const head = {
    Invoice:        str(invoice.number),
    Companycode:    companyCode,
    Suppliercode:   supplierCode,
    Asnnumber:      '',
    Purchaseorder:  str(poNo),
    Plant:          plant,
    Invoicedate:    toODataDate(invoice.date),
    Invoiceamount:  str(invoice.amount),
    Invoicevalue:   str(invoice.value ?? invoice.amount),
    Isdraft:        isDraft ? 'X' : '',
  }

  // Asnnumber is filled in after the head is created
  const items = selectedItems.map((it, idx) => {
    const avl = qtyNum(it.avlAsnQty)
    const conf = qtyNum(it.confQty || it.avlAsnQty)
    const created = qtyNum(it.asnCreated)
    // per-unit SAP tax x Avl. ASN Qty (same as the Tax Breakdown popup)
    const lineTax = (perUnit) => ((Number(perUnit) || 0) * avl).toFixed(2)

    return {
      Companycode:         companyCode,
      Suppliercode:        supplierCode,
      Asnnumber:           '',
      Asnitem:             String((idx + 1) * 10).padStart(5, '0'),
      Purchaseorder:       str(poNo),
      Poitem:              str(it.itemNo).padStart(5, '0'),
      Plant:               str(it.plant || plant),
      Scheduleitem:        str(it.schLine || '1'),
      Material:            str(it.materialNumber),
      Materialname:        str(it.materialName),
      Shipmentdate:        toODataDate(it.shipmentDateIso || it.shipmentDate),
      Storageloc:          str(it.storageLocation),
      Poqty:               str(it.totalQty),
      Confirmedqty:        str(it.confQty || it.avlAsnQty),
      Deliveredqty:        str(it.deliveredQty || '0.00'),
      Asncreatedqty:       str(it.asnCreated || '0.00'),
      Unit:                str(it.totalUnit),
      Asnavlqty:           str(it.avlAsnQty),
      // confirmed - (ASN created + Avl. ASN qty)
      Remainingasnqty:     fmtQty(conf - (created + avl)),
      Cgst:                lineTax(it.cgst),
      Sgst:                lineTax(it.sgst),
      Igst:                lineTax(it.igst),
      Vendorreturnqty:     str(it.vendorReturnQty || '0.00'),
      Shortgrnqty:         str(it.shortGrnQty || '0.00'),
      Netprice:            str(it.netPrice),
      Suppliernetprice:    str(it.supplierNetPrice || it.netPrice),
      Taxmismatch:         it.taxMismatch ? 'X' : '',
      Packingmaterialtype: str(it.packingMaterialType),
      Packingmaterialqty:  str(it.packingMaterialQty || '1'),
      Spq:                 str(it.spq),
      Pdirno:              str(it.pdirNo),
    }
  })

  return { head, items }
}

async function readError(res) {
  let detail = ''
  try {
    const errJson = await res.json()
    detail = errJson?.error?.message?.value || JSON.stringify(errJson)
  } catch {
    detail = await res.text().catch(() => '')
  }
  const err = new Error(detail || `HTTP ${res.status}`)
  err.status = res.status
  return err
}

async function postJson(url, csrfToken, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHeaders(), 'X-CSRF-Token': csrfToken },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await readError(res)
  if (res.status === 204) return {}
  const json = await res.json()
  return json.d || json
}

async function patchJson(url, csrfToken, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...getHeaders(), 'X-CSRF-Token': csrfToken, 'If-Match': '*' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await readError(res)
  return {}
}

// Escapes a value for use inside an OData key predicate: Key='value'
const keyVal = (v) => encodeURIComponent(String(v ?? '').replace(/'/g, "''"))

// First non-empty value among several possible property names.
// Case-insensitive: the HTTP handler returns lowercase keys ("asnnumber", "status", ...).
const pick = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return ''
  const lower = {}
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v
  for (const k of keys) {
    const v = lower[k.toLowerCase()]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return ''
}

/**
 * Shared low-level call to ZHTTP_ASN_CREATE. Throws on ANY failure:
 *  - HTTP error / expired session,
 *  - business-level failure (response STATUS is not SUCCESS — HTTP 200 alone is not enough),
 *  - a missing ASN number, but only when requireAsnNumber is true.
 * CSRF is not required for this handler.
 */
async function callAsnHttp(payload, { requireAsnNumber }) {
  const response = await fetch(ASN_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if ((response.headers.get('content-type') || '').includes('text/html')) {
    throw new Error('Your SAP session has expired — please reload the page to sign in again.')
  }

  const responseText = await response.text()

  let result = {}
  try {
    result = responseText ? JSON.parse(responseText) : {}
  } catch {
    result = { message: responseText }
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error?.message?.value ||
      `Request failed: HTTP ${response.status}`
    )
  }

  const data = result?.d || result

  console.log('[ASN] Response:', data)

  // Business-level validation: STATUS must be SUCCESS
  const sapStatus = str(pick(data, 'STATUS', 'Status', 'status')).toUpperCase()
  const sapMessage = str(pick(data, 'MESSAGE', 'Message', 'message'))
  if (sapStatus !== 'SUCCESS') {
    throw new Error(
      `ZHTTP_ASN_CREATE returned STATUS "${sapStatus || 'missing'}"${sapMessage ? `: ${sapMessage}` : ''} — nothing was saved.`
    )
  }

  // Handler returns lowercase "asnnumber"; other casings are accepted too
  const asnNumber = str(pick(data, 'ASNNUMBER', 'AsnNum', 'asnNumber'))
  if (requireAsnNumber && !asnNumber) {
    throw new Error('ZHTTP_ASN_CREATE did not return an ASN number — nothing was saved.')
  }

  return { data, sapStatus, asnNumber }
}

/**
 * CREATE ASN (head Type 'A').
 * Requires a real SAP-generated ASN number, so callers can never continue to
 * persistence without one.
 */
export async function postCreateAsn({
  poNo,
  invoice,
  selectedItems,
  header = {},
  isDraft = false,
}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400))

    return {
      AsnNum: `DK-ASN-${Date.now().toString().slice(-6)}`,
      FisYear: String(new Date().getFullYear()),
      Po_No: poNo,
      InvoiceNum: invoice.number,
    }
  }

  if (!poNo) {
    throw new Error('Purchase order number is missing')
  }

  if (!selectedItems?.length) {
    throw new Error('No items selected for ASN creation')
  }

  const { head, items } = buildAsnPayload({
    poNo,
    invoice,
    selectedItems,
    header,
    isDraft,
  })

  const payload = {
    head: { ...head, Type: ASN_TYPE_CREATE, Status: ASN_HEAD_STATUS },
    items,
  }

  const { data, sapStatus, asnNumber } = await callAsnHttp(payload, { requireAsnNumber: true })

  return {
    ...data,
    Status: sapStatus,
    AsnNum: asnNumber,
    FisYear: str(pick(data, 'FISYEAR')) || String(new Date().getFullYear()),
    Po_No: str(pick(data, 'PURCHASEORDER')) || poNo,
    InvoiceNum: str(pick(data, 'INVOICE')) || invoice.number,
  }
}

/**
 * CONFIRM PO (head Type 'CP').
 * No invoice is involved and an ASN number is optional. Success is decided only
 * by STATUS = SUCCESS from ZHTTP_ASN_CREATE.
 */
export async function postConfirmPo({
  poNo,
  selectedItems,
  header = {},
}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400))

    return { AsnNum: '', FisYear: '', Po_No: poNo }
  }

  if (!poNo) {
    throw new Error('Purchase order number is missing')
  }

  if (!selectedItems?.length) {
    throw new Error('No items selected for confirmation')
  }

  const emptyInvoice = { number: '', date: '', amount: '' }
  const { head, items } = buildAsnPayload({
    poNo,
    invoice: emptyInvoice,
    selectedItems,
    header,
  })

  const payload = {
    head: { ...head, Type: ASN_TYPE_CONFIRM, Status: ASN_HEAD_STATUS },
    items,
  }

  const { data, sapStatus, asnNumber } = await callAsnHttp(payload, { requireAsnNumber: false })
  const message = str(pick(data, 'MESSAGE', 'Message', 'message'))

  return {
    ...data,
    Status: sapStatus,
    Message: message,
    AsnNum: asnNumber,
    FisYear: asnNumber ? (str(pick(data, 'FISYEAR')) || String(new Date().getFullYear())) : '',
    Po_No: str(pick(data, 'PURCHASEORDER')) || poNo,
  }
}

/**
 * Fetch a CSRF token from the OData service root.
 */
async function fetchODataCsrfToken() {
  const res = await fetch(`${ODATA_BASE}/`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-CSRF-Token': 'Fetch' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Could not fetch CSRF token: HTTP ${res.status}`)
  const token = res.headers.get('x-csrf-token')
  if (!token) throw new Error('CSRF token was not returned by SAP')
  return token
}

/**
 * After the HTTP service returns the ASN number, persist the ASN into
 * ZP_PUR_ASN_HEAD (1 call) and ZP_PUR_ASN_ITEM (1 call per selected item).
 * On a normal save (not a draft) the head is then marked Issaved = 'X'.
 *
 * Resumable: if a save fails part-way, the thrown error carries
 *   e.headSaved  (true once the head row exists) and
 *   e.itemsSaved (index of the first item that was NOT saved),
 * and a retry passes skipHead / startIndex so nothing is posted twice.
 */
export async function saveAsnToOData({
  asnNumber,
  poNo,
  invoice,
  selectedItems,
  header = {},
  skipHead = false,
  startIndex = 0,
  isDraft = false,
}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200))
    return { head: {}, items: [] }
  }
  if (!asnNumber) throw new Error('ASN number is missing, cannot post to OData')

  // Reuse the same payload builder, then stamp the ASN number from the HTTP service
  const { head, items } = buildAsnPayload({ poNo, invoice, selectedItems, header, isDraft })
  head.Asnnumber = str(asnNumber)
  const itemPayloads = items.map(it => ({ ...it, Asnnumber: str(asnNumber) }))

  const csrfToken = await fetchODataCsrfToken()

  // 1. Head first (skipped on retry if it was already saved)
  const headResult = skipHead
    ? null
    : await postJson(`${ODATA_BASE}/ZP_PUR_ASN_HEAD`, csrfToken, head)

  // 2. Then all items (sequential keeps ASN item order and makes errors easy to trace)
  const itemResults = []
  for (let i = startIndex; i < itemPayloads.length; i++) {
    const item = itemPayloads[i]
    try {
      itemResults.push(await postJson(`${ODATA_BASE}/ZP_PUR_ASN_ITEM`, csrfToken, item))
    } catch (e) {
      e.message = `ASN item ${item.Asnitem} (PO item ${item.Poitem}) failed: ${e.message}`
      e.headSaved = true
      e.itemsSaved = i
      throw e
    }
  }

  // 3. Mark the ASN as saved only after the head and every item were written.
  //    Drafts keep Issaved empty.
  if (!isDraft) {
    const headUrl =
      `${ODATA_BASE}/ZP_PUR_ASN_HEAD(` +
      `Invoice='${keyVal(head.Invoice)}',Companycode='${keyVal(head.Companycode)}',` +
      `Suppliercode='${keyVal(head.Suppliercode)}',Asnnumber='${keyVal(head.Asnnumber)}')`
    try {
      await patchJson(headUrl, csrfToken, { Issaved: 'X' })
    } catch (e) {
      e.message = `ASN ${asnNumber} rows were saved, but marking it as saved failed: ${e.message}`
      e.headSaved = true
      e.itemsSaved = itemPayloads.length // retry skips head and items and only repeats this step
      throw e
    }
  }

  console.log('[ASN] OData saved:', { head: headResult, items: itemResults })
  return { head: headResult, items: itemResults }
}