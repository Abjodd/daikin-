// ═══════════════════════════════════════════════════════════════
// Schedule Release API
//
//   Live (deployed build)  → ABAP OData via the approuter (/sap/...)
//   Mock (npm run dev)     → SchedulereleaseMock.js
//   Override either way with VITE_USE_MOCK=true / false in .env
//
// CDS views used (all in SR_SERVICE, see sapOData.js):
//   ZCDS_SCHDULEAGR_HEAD   → left sidebar (one row per scheduling agreement)
//   ZCDS_SCHDULEAGR_ITEM   → right side, items of the selected agreement
//   ZCDS_SCHEDULEAGR_SCH   → schedule lines of one item (line-item page)
//
// Method names and return shapes are identical to the mock, so the pages
// don't know which one they're talking to.
// ═══════════════════════════════════════════════════════════════
import { mockScheduleReleaseApi } from './SchedulereleaseMock.js'
import { sapDateDisplay } from './Mockdata.js'
import { odataGet, q, toSap8, num, str, sameItem } from './sapOData.js'

const flag = import.meta.env.VITE_USE_MOCK
export const USE_MOCK = flag ? flag === 'true' : import.meta.env.DEV

const HEAD = 'ZCDS_SCHDULEAGR_HEAD'
const ITEM = 'ZCDS_SCHDULEAGR_ITEM'
const SCH = 'ZCDS_SCHEDULEAGR_SCH'

const isoToSap8 = (iso) => (iso || '').replace(/-/g, '')

// Supplier confirmation isn't in these CDS views yet, so every item starts as
// "Confirmation Required" (this also keeps "Create ASN" disabled, as in the mock).
const NOT_CONFIRMED = 'Confirmation Required'

// ── mappers: SAP fields → the shapes the pages already use ──────

function mapHeader(h, plant = '') {
  return {
    id: str(h.SchedulingAgreement),
    plant,
    plantName: plant ? 'Plant' : '', // the views have no plant name; pages show "Plant (1710)"
    date: sapDateDisplay(toSap8(h.PurchasingDocumentOrderDate) || toSap8(h.CreationDate)),
    type: str(h.PurchasingDocumentType),
    vendor: str(h.Supplier),
    vendorNo: str(h.Supplier),
    currency: str(h.DocumentCurrency) || 'INR',
    companyCode: str(h.CompanyCode),
    validFrom: sapDateDisplay(toSap8(h.ValidityStartDate)),
    validTo: sapDateDisplay(toSap8(h.ValidityEndDate)),
    asnFlag: '',
    saFlag: '',
    items: [],
  }
}

function mapItem(it, lines) {
  const mine = lines.filter((l) => sameItem(l.SchedulingAgreementItem, it.SchedulingAgreementItem))
  const total = mine.reduce((s, l) => s + num(l.ScheduleLineOrderQuantity), 0)
  const delivered = mine.reduce((s, l) => s + num(l.RoughGoodsReceiptQty), 0)
  const uom = str(it.OrderQuantityUnit)
  return {
    itemNo: str(it.SchedulingAgreementItem),
    scheduleItem: str(it.SchedulingAgreementItem),
    materialName: str(it.PurchasingDocumentItemText) || str(it.Material),
    materialNumber: str(it.Material),
    hsnCode: '', // not in ZCDS_SCHDULEAGR_ITEM
    plant: str(it.Plant),
    storageLocation: str(it.StorageLocation),
    deliverySchedule: String(total || num(it.TargetQuantity)),
    deliveryUnit: uom,
    deliveredQty: String(delivered),
    deliveredUnit: uom,
    unitPrice: String(num(it.NetPriceAmount)),
    currency: str(it.DocumentCurrency),
    status: NOT_CONFIRMED,
    scheduleLines: [],
  }
}

function mapScheduleLine(l) {
  return {
    schLineNo: str(l.ScheduleLine),
    deliveryDate: sapDateDisplay(toSap8(l.ScheduleLineDeliveryDate)),
    deliveryDateRaw: toSap8(l.ScheduleLineDeliveryDate),
    deliverySchedule: num(l.ScheduleLineOrderQuantity),
    deliveredQty: num(l.RoughGoodsReceiptQty),
    confirmedQty: 0,
    unit: str(l.OrderQuantityUnit),
    confkey: '',
    isFixed: str(l.ScheduleLineIsFixed) === 'X',
  }
}

function mapConfirmRow(agreementId, it, l) {
  const date = toSap8(l.ScheduleLineDeliveryDate)
  return {
    itemNo: str(it.SchedulingAgreementItem),
    scheduleLine: str(l.ScheduleLine),
    materialNo: str(it.Material),
    materialDesc: str(it.PurchasingDocumentItemText) || str(it.Material),
    storageLocation: str(it.StorageLocation),
    requiredQty: num(l.ScheduleLineOrderQuantity),
    confirmedQty: 0,
    asnQty: 0,
    deliveryDate: sapDateDisplay(date),
    deliveryDateRaw: date,
    dispatchDate: sapDateDisplay(date),
    uom: str(l.OrderQuantityUnit) || str(it.OrderQuantityUnit),
    scheduleNo: agreementId,
  }
}

// ── live API ────────────────────────────────────────────────────

const liveApi = {
  async fetchAllSuppliers() {
    const rows = await odataGet(HEAD, { select: 'Supplier' })
    const ids = [...new Set(rows.map((r) => str(r.Supplier)).filter(Boolean))]
    return ids.map((id) => ({ lifnr: id, name: id }))
  },

  async listAgreements({ search = '', plants = [], vendorNo = '' } = {}) {
    const [heads, itemPlants] = await Promise.all([
      odataGet(HEAD, {
        filter: vendorNo ? `Supplier eq ${q(vendorNo)}` : '',
        select: 'SchedulingAgreement,Supplier,PurchasingDocumentType,PurchasingDocumentOrderDate,CreationDate,DocumentCurrency,CompanyCode,ValidityStartDate,ValidityEndDate',
        orderby: 'SchedulingAgreement desc',
      }),
      // The header view has no Plant — take it from the agreement's items
      odataGet(ITEM, { select: 'SchedulingAgreement,Plant' }),
    ])

    const plantOf = new Map()
    itemPlants.forEach((r) => {
      const id = str(r.SchedulingAgreement)
      if (!plantOf.has(id) && str(r.Plant)) plantOf.set(id, str(r.Plant))
    })

    let rows = heads.map((h) => mapHeader(h, plantOf.get(str(h.SchedulingAgreement)) || ''))

    const s = search.trim().toLowerCase()
    if (s) {
      rows = rows.filter((a) =>
        a.id.toLowerCase().includes(s) ||
        a.plant.toLowerCase().includes(s) ||
        a.plantName.toLowerCase().includes(s) ||
        a.vendor.toLowerCase().includes(s),
      )
    }
    if (plants.length) rows = rows.filter((a) => plants.includes(a.plant))
    return rows
  },

  async getAgreement(id) {
    const f = `SchedulingAgreement eq ${q(id)}`
    const [heads, items, lines] = await Promise.all([
      odataGet(HEAD, { filter: f }),
      odataGet(ITEM, { filter: f, orderby: 'SchedulingAgreementItem' }),
      odataGet(SCH, {
        filter: f,
        select: 'SchedulingAgreementItem,ScheduleLine,ScheduleLineOrderQuantity,RoughGoodsReceiptQty',
      }),
    ])
    if (!heads.length) return null

    const plant = items.map((i) => str(i.Plant)).find(Boolean) || ''
    const agreement = mapHeader(heads[0], plant)
    agreement.items = items.map((it) => mapItem(it, lines))
    return agreement
  },

  async getScheduleLines(scheduleNo, scheduleItem /* , materialNo, uom */) {
    // Filter by agreement only, then match the item here: item numbers can be "10" or "00010"
    const lines = await odataGet(SCH, {
      filter: `SchedulingAgreement eq ${q(scheduleNo)}`,
      orderby: 'ScheduleLine',
    })
    return lines.filter((l) => sameItem(l.SchedulingAgreementItem, scheduleItem)).map(mapScheduleLine)
  },

  async getConfirmData({ scheduleNo, fromDate, toDate, storageLocation = '' }) {
    if (!scheduleNo || scheduleNo === 'undefined') throw new Error('No schedule number provided')

    const f = `SchedulingAgreement eq ${q(scheduleNo)}`
    const [items, lines] = await Promise.all([odataGet(ITEM, { filter: f }), odataGet(SCH, { filter: f })])

    let rows = lines
      .map((l) => {
        const it = items.find((i) => sameItem(i.SchedulingAgreementItem, l.SchedulingAgreementItem))
        return it ? mapConfirmRow(scheduleNo, it, l) : null
      })
      .filter(Boolean)

    if (fromDate) rows = rows.filter((r) => r.deliveryDateRaw >= isoToSap8(fromDate))
    if (toDate) rows = rows.filter((r) => r.deliveryDateRaw <= isoToSap8(toDate))
    if (storageLocation.trim()) rows = rows.filter((r) => r.storageLocation === storageLocation.trim())
    return rows
  },

  async submitConfirm(/* scheduleNo, selectedRows */) {
    // Needs a write service in ABAP (e.g. a confirmation entity / RAP action).
    throw new Error('Confirming schedule lines is not connected to SAP yet.')
  },
}

export const scheduleReleaseApi = USE_MOCK ? mockScheduleReleaseApi : liveApi
export default scheduleReleaseApi
