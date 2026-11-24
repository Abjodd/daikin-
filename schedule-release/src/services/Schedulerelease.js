// ═══════════════════════════════════════════════════════════════
// Schedule Release API
//   Live (deployed build)  → ABAP OData via the approuter (/sap/...)
//   Mock (npm run dev)     → SchedulereleaseMock.js
//   Override with VITE_USE_MOCK=true / false in .env
//
//   ZCDS_SCHDULEAGR_HEAD   → sidebar (one row per agreement)
//   ZCDS_SCHDULEAGR_ITEM   → items of the selected agreement
//   ZCDS_SCHEDULEAGR_SCH   → schedule lines
//   ZP_SCH_AGREEMENT       → item-level confirmation status (read + POST)
// ═══════════════════════════════════════════════════════════════
import { mockScheduleReleaseApi } from './SchedulereleaseMock.js'
import { sapDateDisplay } from './Mockdata.js'
import {
  odataGet, odataPost, fetchConfirmedItems, postAsnCreate, ZP_SCH_ENTITY,
  q, toSap8, num, str, sameItem, item4,
} from './sapOData.js'
import { buildAsnPayloadSR } from './Createasnsch.js'

const flag = import.meta.env.VITE_USE_MOCK
export const USE_MOCK = flag ? flag === 'true' : import.meta.env.DEV

const HEAD = 'ZCDS_SCHDULEAGR_HEAD'
const ITEM = 'ZCDS_SCHDULEAGR_ITEM'
const SCH = 'ZCDS_SCHEDULEAGR_SCH'

const isoToSap8 = (iso) => (iso || '').replace(/-/g, '')

const NOT_CONFIRMED = 'Confirmation Required'
const CONFIRMED = 'Confirmed'

// ── mappers ─────────────────────────────────────────────────
function mapHeader(h, plant = '') {
  return {
    id: str(h.SchedulingAgreement),
    plant,
    plantName: plant ? 'Plant' : '',
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

function mapItem(it, lines, confirmedItems) {
  const isConfirmed = confirmedItems.has(parseInt(it.SchedulingAgreementItem, 10))
  const mine = lines.filter((l) => sameItem(l.SchedulingAgreementItem, it.SchedulingAgreementItem))
  const total = mine.reduce((s, l) => s + num(l.ScheduleLineOrderQuantity), 0)
  const delivered = mine.reduce((s, l) => s + num(l.RoughGoodsReceiptQty), 0)
  const uom = str(it.OrderQuantityUnit)
  const mappedLines = mine.map((l) => mapScheduleLine(l, isConfirmed))
  const firstRaw = mappedLines[0]?.deliveryDateRaw || ''
  const firstIso = firstRaw && firstRaw.length === 8 ? `${firstRaw.slice(0, 4)}-${firstRaw.slice(4, 6)}-${firstRaw.slice(6, 8)}` : ''

  return {
    itemNo: str(it.SchedulingAgreementItem),
    scheduleItem: str(it.SchedulingAgreementItem),
    materialName: str(it.PurchasingDocumentItemText) || str(it.Material),
    materialNumber: str(it.Material),
    hsnCode: '',
    plant: str(it.Plant),
    storageLocation: str(it.StorageLocation),
    deliverySchedule: String(total || num(it.TargetQuantity)),
    deliveryUnit: uom,
    deliveredQty: String(delivered),
    deliveredUnit: uom,
    unitPrice: String(num(it.NetPriceAmount)),
    currency: str(it.DocumentCurrency),
    status: isConfirmed ? CONFIRMED : NOT_CONFIRMED,
    deliveryDate: mappedLines[0]?.deliveryDate || '',
    deliveryDateRaw: firstRaw,
    deliveryDateIso: firstIso,
    scheduleLines: mappedLines,
  }
}

function mapScheduleLine(l, isConfirmed) {
  const qty = num(l.ScheduleLineOrderQuantity)
  return {
    schLineNo: str(l.ScheduleLine),
    deliveryDate: sapDateDisplay(toSap8(l.ScheduleLineDeliveryDate)),
    deliveryDateRaw: toSap8(l.ScheduleLineDeliveryDate),
    deliverySchedule: qty,
    deliveredQty: num(l.RoughGoodsReceiptQty),
    confirmedQty: isConfirmed ? qty : 0,
    unit: str(l.OrderQuantityUnit),
    confkey: isConfirmed ? 'X' : '',
    isFixed: str(l.ScheduleLineIsFixed) === 'X',
  }
}

function mapConfirmRow(agreementId, it, l, vendorNo, isConfirmed) {
  const date = toSap8(l.ScheduleLineDeliveryDate)
  const qty = num(l.ScheduleLineOrderQuantity)
  return {
    itemNo: str(it.SchedulingAgreementItem),
    scheduleLine: str(l.ScheduleLine),
    materialNo: str(it.Material),
    materialDesc: str(it.PurchasingDocumentItemText) || str(it.Material),
    storageLocation: str(it.StorageLocation),
    requiredQty: qty,
    confirmedQty: isConfirmed ? qty : 0,
    plant: str(it.Plant),
    unitPrice: num(it.NetPriceAmount),
    asnQty: 0,
    deliveryDate: sapDateDisplay(date),
    deliveryDateRaw: date,
    dispatchDate: sapDateDisplay(date),
    uom: str(l.OrderQuantityUnit) || str(it.OrderQuantityUnit),
    scheduleNo: agreementId,
    vendorNo, // needed as key for ZP_SCH_AGREEMENT
    confkey: isConfirmed ? 'X' : '',
    alreadyConfirmed: isConfirmed,
  }
}
const CONFIRM_TYPE = 'CS'               // value sent in head.Type
const CONFIRM_REQ_STATUS = ''         // value sent in head.Status
const CONFIRM_OK = ['CF', 'CONF'] 
// ── live API ────────────────────────────────────────────────
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
    const [heads, items, lines, confirmedItems] = await Promise.all([
      odataGet(HEAD, { filter: f }),
      odataGet(ITEM, { filter: f, orderby: 'SchedulingAgreementItem' }),
      odataGet(SCH, {
        filter: f,
        select: 'SchedulingAgreementItem,ScheduleLine,ScheduleLineOrderQuantity,RoughGoodsReceiptQty',
      }),
      fetchConfirmedItems(id),
    ])
    if (!heads.length) return null

    const plant = items.map((i) => str(i.Plant)).find(Boolean) || ''
    const agreement = mapHeader(heads[0], plant)
    agreement.items = items.map((it) => mapItem(it, lines, confirmedItems))
    return agreement
  },

  async getScheduleLines(scheduleNo, scheduleItem /* , materialNo, uom */) {
    const [lines, confirmedItems] = await Promise.all([
      odataGet(SCH, { filter: `SchedulingAgreement eq ${q(scheduleNo)}`, orderby: 'ScheduleLine' }),
      fetchConfirmedItems(scheduleNo),
    ])
    const isConfirmed = confirmedItems.has(parseInt(scheduleItem, 10))
    return lines
      .filter((l) => sameItem(l.SchedulingAgreementItem, scheduleItem))
      .map((l) => mapScheduleLine(l, isConfirmed))
  },

  async getConfirmData({ scheduleNo, fromDate, toDate, storageLocation = '' }) {
    if (!scheduleNo || scheduleNo === 'undefined') throw new Error('No schedule number provided')

    const f = `SchedulingAgreement eq ${q(scheduleNo)}`
    const [heads, items, lines, confirmedItems] = await Promise.all([
      odataGet(HEAD, { filter: f, select: 'Supplier' }),
      odataGet(ITEM, { filter: f }),
      odataGet(SCH, { filter: f }),
      fetchConfirmedItems(scheduleNo),
    ])
    const vendorNo = str(heads[0]?.Supplier)

    let rows = lines
      .map((l) => {
        const it = items.find((i) => sameItem(i.SchedulingAgreementItem, l.SchedulingAgreementItem))
        if (!it) return null
        const isConfirmed = confirmedItems.has(parseInt(it.SchedulingAgreementItem, 10))
        return mapConfirmRow(scheduleNo, it, l, vendorNo, isConfirmed)
      })
      .filter(Boolean)

    const normalizeDateStr = (d) => {
      if (!d) return ''
      const s = String(d).replace(/[-.]/g, '')
      return s.length >= 8 ? s.slice(0, 8) : s
    }

    if (fromDate) {
      const fNorm = normalizeDateStr(fromDate)
      rows = rows.filter((r) => normalizeDateStr(r.deliveryDateRaw) >= fNorm)
    }
    if (toDate) {
      const tNorm = normalizeDateStr(toDate)
      rows = rows.filter((r) => normalizeDateStr(r.deliveryDateRaw) <= tNorm)
    }
    if (storageLocation.trim()) rows = rows.filter((r) => r.storageLocation === storageLocation.trim())
    return rows
  },

  // ZP_SCH_AGREEMENT is item-level (no schedule line), so one POST per unique item.
    // Sequence: (0) backend re-check → (1) POST ZHTTP_ASN_CREATE → (2) read ASN → (3) insert ZP_SCH_AGREEMENT
    async submitConfirm(scheduleNo, selectedRows) {
    if (!scheduleNo || scheduleNo === 'undefined') throw new Error('No schedule number provided')
    if (!selectedRows?.length) throw new Error('No lines selected')

    const heads = await odataGet(HEAD, {
      filter: `SchedulingAgreement eq ${q(scheduleNo)}`, select: 'Supplier,CompanyCode',
    })
    const vendor = str(heads[0]?.Supplier)
    const companyCode = str(heads[0]?.CompanyCode)

    // backend re-check so confirmed items are never re-sent
    const already = await fetchConfirmedItems(scheduleNo, { strict: true })
    const byItem = new Map()
    selectedRows.forEach((r) => {
      const k = parseInt(r.itemNo, 10)
      if (!byItem.has(k) && !already.has(k)) byItem.set(k, r)
    })
    const rows = [...byItem.values()]
    if (!rows.length) throw new Error('Selected items are already confirmed. Please refresh.')

    // 1) HTTP request: same payload as Create ASN, plus Type and Status in head
    const payload = buildAsnPayloadSR({
      scheduleNo,
      type: CONFIRM_TYPE,
      status: CONFIRM_REQ_STATUS,
      header: { companyCode, vendorNo: vendor, plant: rows[0].plant },
      invoice: {},
      items: rows.map((r) => ({
        ebelp: r.itemNo,
        schLine: String(parseInt(r.scheduleLine, 10) || 1),
        materialNumber: r.materialNo,
        materialName: r.materialDesc,
        shipmentDateIso: r.deliveryDateRaw,
        storageLocation: r.storageLocation,
        totalQty: String(r.requiredQty),
        confQty: String(r.requiredQty),
        avlAsnQty: String(r.requiredQty),
        asnCreated: '0',
        deliveredQty: '0',
        netPrice: String(r.unitPrice || 0),
        supplierNetPrice: String(r.unitPrice || 0),
      })),
    })

    const { status, message } = await postAsnCreate(payload, { requireAsn: false })

    // 2) Only CF / CONF from SAP allows the table write
    if (!CONFIRM_OK.includes(status)) {
      throw new Error(message || `SAP did not confirm the items (status: ${status || 'empty'}). Nothing was saved.`)
    }

    // 3) Post the same data to ZP_SCH_AGREEMENT (one row per item)
    const results = []
    for (const r of rows) {
      results.push(await odataPost(ZP_SCH_ENTITY, {
        Schagreement: scheduleNo,
        Schagreementitem: item4(r.itemNo),
        Vendor: vendor,
        Material: r.materialNo,
        Type: payload.head.Type,
        Status: status,
      }))
    }
    return results
  },

  // ASN already exists, only the table write is outstanding
  async retryPersist(scheduleNo, { vendor, rows, asnNum, fisYear }) {
    await saveAgreementItems({ scheduleNo, vendor, rows, asnNumber: asnNum })
    return { asnNum, fisYear }
  },
}

export const scheduleReleaseApi = USE_MOCK ? mockScheduleReleaseApi : liveApi
export default scheduleReleaseApi