/**
 * Create ASN Post Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const ODATA_BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
})

const str = (v) => String(v ?? '').trim()

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
  const s = toSapDate(v)            // 'YYYYMMDD' or ''
  if (!s) return null
  return `/Date(${Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))})/`
}
/**
 * Build POST payload for PO ASN creation supporting both ZP_PUR_ASN_HEAD/ITEM and legacy entities.
 */
/**
 * Builds the head payload (ZP_PUR_ASN_HEAD) and one item payload per selected row (ZP_PUR_ASN_ITEM).
 */
export function buildAsnPayload({ poNo, invoice, selectedItems, header = {} }) {
  const companyCode = str(header.companyCode || '1000')
  const supplierCode = str(header.vendorNo || header.vendor || '')

  const head = {
    Invoice:        str(invoice.number),
    Companycode:    companyCode,
    Suppliercode:   supplierCode,
    Asnnumber:      '',
    Purchaseorder:  str(poNo),
    Plant:          str(header.plant || ''),
    Invoicedate:    toODataDate(invoice.date),
    Invoiceamount:  str(invoice.amount),
    Invoicevalue:   str(invoice.amount),
  }

  // Asnnumber is filled in after the head is created
  const items = selectedItems.map((it, idx) => ({
    Companycode:         companyCode,
    Suppliercode:        supplierCode,
    Asnnumber:           '',
    Asnitem:             String((idx + 1) * 10).padStart(5, '0'),
    Purchaseorder:       str(poNo),
    Poitem:              str(it.itemNo).padStart(5, '0'),
    Plant:               str(header.plant || ''),
    Scheduleitem:        str(it.schLine || '1'),
    Material:            str(it.materialNumber),
    Materialname:        str(it.materialName),
    Shipmentdate:        toODataDate(it.shipmentDateIso || it.shipmentDate),
    Storageloc:          str(it.storageLocation),
    Poqty:               str(it.totalQty),
    Confirmedqty:        str(it.confQty || it.avlAsnQty),
    Deliveredqty:        str(it.deliveredQty || '0.00'),
    Asncreatedqty:       str(it.asnCreated || '0.00'),
    Asnavlqty:           str(it.avlAsnQty),
    Vendorreturnqty:     str(it.vendorReturnQty || '0.00'),
    Shortgrnqty:         str(it.shortGrnQty || '0.00'),
    Netprice:            str(it.netPrice),
    Suppliernetprice:    str(it.supplierNetPrice || it.netPrice),
    Taxmismatch:         it.taxMismatch ? 'X' : '',
    Packingmaterialtype: str(it.packingMaterialType),
    Packingmaterialqty:  str(it.packingMaterialQty || '1'),
    Spq:                 str(it.spq),
    Pdirno:              str(it.pdirNo),
  }))

  return { head, items }
}

async function postJson(url, csrfToken, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHeaders(), 'X-CSRF-Token': csrfToken },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const errJson = await res.json()
      detail = errJson?.error?.message?.value || JSON.stringify(errJson)
    } catch {
      detail = await res.text().catch(() => '')
    }
    const err = new Error(detail || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return {}
  const json = await res.json()
  return json.d || json
}

const ASN_CREATE_URL = '/sap/bc/http/sap/ZHTTP_ASN_CREATE'

export async function postCreateAsn({
  poNo,
  invoice,
  selectedItems,
  header = {},
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

  // 1. Build existing ASN payload
  const { head, items } = buildAsnPayload({
    poNo,
    invoice,
    selectedItems,
    header,
  })

  // 2. Combine header and items into one request
  const payload = {
    head,
    items,
  }

  // 3. Fetch CSRF token from HTTP service
  const tokenRes = await fetch(ASN_CREATE_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': 'Fetch',
    },
    credentials: 'include',
  })

  if (!tokenRes.ok) {
    throw new Error(
      `Could not fetch CSRF token: ${tokenRes.status}`
    )
  }

  const csrfToken =
    tokenRes.headers.get('x-csrf-token') || ''

  if (!csrfToken) {
    throw new Error('CSRF token was not returned by SAP')
  }

  // 4. Call custom HTTP service
  const response = await fetch(ASN_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  // 5. Handle SAP response
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
      `ASN creation failed: HTTP ${response.status}`
    )
  }

  const data = result?.d || result

  console.log('[ASN] Creation response:', data)

  // Map backend property ASNNUMBER (uppercase from HTTP service response), Asnnumber, or AsnNum
  const asnNumber =
    data.ASNNUMBER ||
    data.Asnnumber ||
    data.AsnNum ||
    data.asnNumber ||
    data.asnnum ||
    ''

  return {
    ...data,
    AsnNum: asnNumber,
    FisYear: data.FISYEAR || data.FisYear || String(new Date().getFullYear()),
    Po_No: data.PURCHASEORDER || poNo,
    InvoiceNum: data.INVOICE || invoice.number,
  }
}