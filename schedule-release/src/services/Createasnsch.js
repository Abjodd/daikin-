// ═══════════════════════════════════════════════════════════════
// Create ASN API for Schedule Release
// Supports both live custom HTTP service (/sap/bc/http/sap/ZHTTP_ASN_CREATE)
// and mock fallback for offline development.
// ═══════════════════════════════════════════════════════════════
import { findAgreement, PDIR_REF_NOS, delay, sapDateDisplay } from './Mockdata.js'
import { odataGet, fetchConfirmedItems, q, toSap8, num, sameItem } from './sapOData.js'

const flag = import.meta.env.VITE_USE_MOCK
export const USE_MOCK = flag ? flag === 'true' : false

const ASN_CREATE_URL = '/sap/bc/http/sap/ZHTTP_ASN_CREATE'

const str = (v) => String(v ?? '').trim()
const isoToSap8 = (iso) => (iso || '').replace(/-/g, '')

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
  const s = toSapDate(v)
  if (!s) return null
  return `/Date(${Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))})/`
}

let asnSeq = 1

function buildEligibleItem(a, it, l) {
  const schLine = String(parseInt(l.schLineNo, 10))
  const avl = Math.max(0, l.confirmedQty - l.asnCreated)
  return {
    itemNo: `${it.itemNo}-${schLine}-${l.date}`,
    ebelp: it.itemNo,
    schLine,
    ebeln: a.id,
    scheduleNo: a.id,
    eindt: l.date,
    werks: a.plant,
    maktx: it.materialName,
    plantDesc: a.plantName,
    perUnit: '1',
    warningMsg: '',
    pstyp: '',

    igst: '0', cgst: '8.72', sgst: '8.72',
    igstPer: '0', cgstPer: '9', sgstPer: '9',
    tax: '17.44',
    currency: 'INR',

    materialName: it.materialName,
    materialNumber: it.materialNumber,
    storageLocation: it.storageLocation,
    warehouseNo: 'W01',
    hsn: it.hsnCode || '84159000',
    hsnCode: it.hsnCode || '84159000',

    shipmentDate: sapDateDisplay(l.date),
    shipmentDateIso: l.date ? `${l.date.slice(0, 4)}-${l.date.slice(4, 6)}-${l.date.slice(6, 8)}` : '',
    materialExpiry: '',

    totalQty: String(l.qty),
    totalUnit: it.uom || 'NO',
    confQty: String(l.confirmedQty),
    confUnit: it.uom || 'NO',
    asnCreated: String(l.asnCreated),
    draftAsnQty: '0',
    spq: String(it.spq || '41.000'),

    avlAsnQty: String(avl),
    delQty: '0',
    deliveredQty: String(l.asnCreated),
    deliveredUnit: it.uom || 'NO',

    netPrice: String(it.unitPrice || '96.88'),
    supplierNetPrice: String(it.unitPrice || '96.88'),

    packingMaterialQty: '1',
    packingMaterialType: 'Trolley',
    packagingType: 'Trolley',
    pdirNo: '',

    fgStock: String(avl),
    qtyPerPackaging: '',
    taxMismatch: false,
    batches: [],
  }
}

export function buildAsnPayloadSR({ scheduleNo, header = {}, invoice = {}, items = [] }) {
  const companyCode = str(header.companyCode || '1810')
  const supplierCode = str(header.vendorNo || header.vendor || '')

  const head = {
    Invoice:        str(invoice.number),
    Companycode:    companyCode,
    Suppliercode:   supplierCode,
    Asnnumber:      '',
    Purchaseorder:  str(scheduleNo),
    Plant:          str(header.plant || ''),
    Invoicedate:    toODataDate(invoice.date),
    Invoiceamount:  str(invoice.amount),
    Invoicevalue:   str(invoice.amount),
  }

  const payloadItems = items.map((it, idx) => ({
    Companycode:         companyCode,
    Suppliercode:        supplierCode,
    Asnnumber:           '',
    Asnitem:             String((idx + 1) * 10).padStart(5, '0'),
    Purchaseorder:       str(scheduleNo),
    Poitem:              str(it.ebelp || it.itemNo || '10').replace(/\D/g, '').padStart(5, '0') || '00010',
    Plant:               str(header.plant || ''),
    Scheduleitem:        str(it.schLine || '1'),
    Material:            str(it.materialNumber),
    Materialname:        str(it.materialName),
    Shipmentdate:        toODataDate(it.shipmentDateIso || it.shipmentDate || it.eindt),
    Storageloc:          str(it.storageLocation),
    Poqty:               str(it.totalQty || '0'),
    Confirmedqty:        str(it.confQty || it.avlAsnQty || '0'),
    Deliveredqty:        str(it.deliveredQty || '0.00'),
    Asncreatedqty:       str(it.asnCreated || '0.00'),
    Asnavlqty:           str(it.avlAsnQty || '0'),
    Vendorreturnqty:     str(it.vendorReturnQty || '0.00'),
    Shortgrnqty:         str(it.shortGrnQty || '0.00'),
    Netprice:            str(it.netPrice || '0.00'),
    Suppliernetprice:    str(it.supplierNetPrice || it.netPrice || '0.00'),
    Taxmismatch:         it.taxMismatch ? 'X' : '',
    Packingmaterialtype: str(it.packingMaterialType || it.packagingType || ''),
    Packingmaterialqty:  str(it.packingMaterialQty || '1'),
    Spq:                 str(it.spq || ''),
    Pdirno:              str(it.pdirNo || ''),
  }))

  return { head, items: payloadItems }
}

// ── LIVE: eligible items from SAP ────────────────────────────────
// A row per schedule line (ZCDS_SCHEDULEAGR_SCH) whose ITEM is confirmed in
// ZP_SCH_AGREEMENT. Available qty = scheduled qty − goods received.
function buildLiveEligibleItem(agreementId, it, l) {
  const date = toSap8(l.ScheduleLineDeliveryDate)
  const schLine = String(parseInt(l.ScheduleLine, 10))
  const qty = num(l.ScheduleLineOrderQuantity)
  const received = num(l.RoughGoodsReceiptQty)
  const avl = Math.max(0, qty - received)
  const uom = str(l.OrderQuantityUnit) || str(it.OrderQuantityUnit) || 'NO'
  const price = String(num(it.NetPriceAmount))
  const itemNo = str(it.SchedulingAgreementItem)

  return {
    itemNo: `${itemNo}-${schLine}-${date}`, // stable key, survives re-fetch / filters
    ebelp: itemNo,
    schLine,
    ebeln: agreementId,
    scheduleNo: agreementId,
    eindt: date,
    werks: str(it.Plant),
    maktx: str(it.PurchasingDocumentItemText) || str(it.Material),
    plantDesc: 'Plant',
    perUnit: '1',
    warningMsg: '',
    pstyp: '',

    // Tax amounts left at 0 → the page calculates them from the percentages.
    // (The CDS views carry a TaxCode but no rates; 9% + 9% is the page's default.)
    igst: '0', cgst: '0', sgst: '0',
    igstPer: '0', cgstPer: '9', sgstPer: '9',
    tax: '0',
    currency: str(it.DocumentCurrency) || 'INR',

    materialName: str(it.PurchasingDocumentItemText) || str(it.Material),
    materialNumber: str(it.Material),
    storageLocation: str(it.StorageLocation),
    warehouseNo: '',
    hsn: '',      // not in the CDS views yet
    hsnCode: '',

    shipmentDate: sapDateDisplay(date),
    shipmentDateIso: date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : '',
    materialExpiry: '',

    totalQty: String(qty),
    totalUnit: uom,
    confQty: String(qty), // item is confirmed → the whole line is
    confUnit: uom,
    asnCreated: '0',      // not in the CDS views yet
    draftAsnQty: '0',
    spq: '',              // not in the CDS views yet

    avlAsnQty: String(avl),
    delQty: '0',
    deliveredQty: String(received),
    deliveredUnit: uom,

    netPrice: price,
    supplierNetPrice: price,

    packingMaterialQty: '1',
    packingMaterialType: 'Trolley',
    packagingType: 'Trolley',
    pdirNo: '',

    fgStock: String(avl),
    qtyPerPackaging: '',
    taxMismatch: false,
    batches: [],
  }
}

async function getEligibleItemsLive({ scheduleNo, fromDate, toDate, storageLocation = '' }) {
  if (!scheduleNo) return []
  const f = `SchedulingAgreement eq ${q(scheduleNo)}`
  const [items, lines, confirmedItems] = await Promise.all([
    odataGet('ZCDS_SCHDULEAGR_ITEM', { filter: f }),
    odataGet('ZCDS_SCHEDULEAGR_SCH', { filter: f, orderby: 'ScheduleLineDeliveryDate' }),
    fetchConfirmedItems(scheduleNo), // Map<itemAsInt, true> from ZP_SCH_AGREEMENT
  ])

  let rows = lines
    .map((l) => {
      const it = items.find((i) => sameItem(i.SchedulingAgreementItem, l.SchedulingAgreementItem))
      if (!it || !confirmedItems.has(parseInt(it.SchedulingAgreementItem, 10))) return null
      return buildLiveEligibleItem(scheduleNo, it, l)
    })
    .filter(Boolean)

  if (fromDate) rows = rows.filter((r) => r.eindt >= isoToSap8(fromDate))
  if (toDate) rows = rows.filter((r) => r.eindt <= isoToSap8(toDate))
  if (storageLocation.trim()) rows = rows.filter((r) => r.storageLocation === storageLocation.trim())
  return rows
}

export const createAsnApi = {
  async getEligibleItems({ scheduleNo, fromDate, toDate, storageLocation = '' } = {}) {
    if (!USE_MOCK) {
      try {
        return await getEligibleItemsLive({ scheduleNo, fromDate, toDate, storageLocation })
      } catch (err) {
        // Same rule as submitAsn: fall back to mock only in local dev
        if (!import.meta.env.DEV) throw err
        console.warn('[Live ASN items] Falling back to mock:', err.message)
      }
    }

    // MOCK
    await delay(350)
    const a = findAgreement(scheduleNo)
    if (!a) return []
    let rows = []
    a.items.forEach((it) => {
      it.lines.forEach((l) => {
        if (l.confkey === 'X') rows.push(buildEligibleItem(a, it, l))
      })
    })
    if (fromDate) rows = rows.filter((r) => r.eindt >= isoToSap8(fromDate))
    if (toDate)   rows = rows.filter((r) => r.eindt <= isoToSap8(toDate))
    if (storageLocation.trim()) rows = rows.filter((r) => r.storageLocation === storageLocation.trim())
    return rows
  },

  async getPdirRefNos(/* scheduleNo */) {
    await delay(200)
    return [...PDIR_REF_NOS]
  },

  async submitAsn({ scheduleNo, plant, header = {}, invoiceNumber, invoiceDate, invoiceAmount, totalPacking, items }) {
    if (!USE_MOCK) {
      try {
        const payload = buildAsnPayloadSR({
          scheduleNo,
          header: { ...header, plant: plant || header?.plant },
          invoice: { number: invoiceNumber, date: invoiceDate, amount: invoiceAmount },
          items,
        })

        const response = await fetch(ASN_CREATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })

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
        const asnNum = data.ASNNUMBER || data.Asnnumber || data.AsnNum || data.asnNumber || ''
        const fisYear = data.FISYEAR || data.FisYear || String(new Date().getFullYear())

        return {
          asnNum,
          fisYear,
          message: `ASN No. ${asnNum}/${fisYear} created successfully`,
          raw: data,
        }
      } catch (err) {
        console.warn('[Live ASN] Falling back to mock submission:', err.message)
        if (import.meta.env.DEV) {
          // fall through to mock below
        } else {
          throw err
        }
      }
    }

    // MOCK SUBMISSION FALLBACK
    await delay(700)
    const a = findAgreement(scheduleNo)
    if (a) {
      items.forEach((row) => {
        const it = a.items.find((i) => i.itemNo === row.ebelp)
        const line = it?.lines.find((l) => parseInt(l.schLineNo, 10) === parseInt(row.schLine, 10))
        if (line) line.asnCreated += parseFloat(row.avlAsnQty || '0')
      })
    }

    const asnNum = String(3100000000 + asnSeq++)
    const fisYear = String(new Date().getFullYear())

    return {
      asnNum,
      fisYear,
      message: `ASN No. ${asnNum}/${fisYear} created successfully`,
      raw: {},
    }
  },

  async uploadAttachment(/* asnDraftId, file, kind */) {
    await delay(200)
    return { ok: true }
  },
}

export async function uploadAllAttachments({ generalAttachments = [], pdirAttachments = [] } = {}) {
  const all = [...generalAttachments, ...pdirAttachments]
  await delay(300 + all.length * 150)
  return { uploaded: all.length, failed: [] }
}

export default createAsnApi
