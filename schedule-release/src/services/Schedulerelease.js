// ═══════════════════════════════════════════════════════════════
// Schedule Release API — MOCK VERSION
// Same method names / return shapes as the OData version, so pages
// don't change when you plug the real backend back in. No auth headers.
// ═══════════════════════════════════════════════════════════════
import {
  AGREEMENTS, SUPPLIERS, MOCK_VENDOR_NO,
  delay, sapDateDisplay, statusOf, findAgreement,
} from './Mockdata.js'

const str = (v) => String(v ?? '').trim()
const isoToSap8 = (iso) => (iso || '').replace(/-/g, '')

function mapHeader(a) {
  return {
    id: a.id,
    plant: a.plant,
    plantName: a.plantName,
    date: sapDateDisplay(a.date),
    type: a.type || 'Manual',
    vendor: a.vendor,
    vendorNo: a.vendorNo,
    currency: 'INR',
    asnFlag: '',
    saFlag: '',
    items: [],
  }
}

function mapItem(it) {
  const total = it.lines.reduce((s, l) => s + l.qty, 0)
  const delivered = it.lines.reduce((s, l) => s + l.asnCreated, 0)
  return {
    itemNo: it.itemNo,
    scheduleItem: it.itemNo,
    materialName: it.materialName,
    materialNumber: it.materialNumber,
    hsnCode: it.hsnCode,
    storageLocation: it.storageLocation,
    deliverySchedule: String(total),
    deliveryUnit: it.uom,
    deliveredQty: String(delivered),
    deliveredUnit: it.uom,
    unitPrice: String(it.unitPrice),
    status: statusOf(it),
    scheduleLines: [],
  }
}

function mapScheduleLine(l, uom) {
  return {
    schLineNo: l.schLineNo,
    deliveryDate: sapDateDisplay(l.date),
    deliverySchedule: l.qty,
    confirmedQty: l.confirmedQty,
    unit: uom,
    confkey: l.confkey,
  }
}

function mapConfirmRow(a, it, l) {
  return {
    itemNo: it.itemNo,
    scheduleLine: l.schLineNo,
    materialNo: it.materialNumber,
    materialDesc: it.materialName,
    storageLocation: it.storageLocation,
    requiredQty: l.qty,
    confirmedQty: l.confirmedQty,
    asnQty: l.asnCreated,
    deliveryDate: sapDateDisplay(l.date),
    deliveryDateRaw: l.date,
    dispatchDate: sapDateDisplay(l.date),
    uom: it.uom,
    scheduleNo: a.id,
  }
}

export const scheduleReleaseApi = {
  async fetchAllSuppliers() {
    await delay(250)
    return SUPPLIERS.map((s) => ({ ...s }))
  },

  async listAgreements({ search = '', plants = [], vendorNo = '' } = {}) {
    await delay(300)
    // Real backend derives the supplier from the login headers when vendorNo is empty
    const vendor = vendorNo || MOCK_VENDOR_NO
    let rows = AGREEMENTS.filter((a) => a.vendorNo === vendor).map(mapHeader)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((a) =>
        a.id.toLowerCase().includes(q) ||
        a.plantName.toLowerCase().includes(q) ||
        a.plant.toLowerCase().includes(q) ||
        a.vendor.toLowerCase().includes(q)
      )
    }
    if (plants.length) rows = rows.filter((a) => plants.includes(a.plant))
    return rows
  },

  async getAgreement(id) {
    await delay(300)
    const a = findAgreement(id)
    if (!a) return null
    const agreement = mapHeader(a)
    agreement.items = a.items.map(mapItem)
    return agreement
  },

  async getScheduleLines(scheduleNo, scheduleItem, materialNo /* , uom */) {
    await delay(300)
    const a = findAgreement(scheduleNo)
    const it = a?.items.find((i) => i.itemNo === scheduleItem && i.materialNumber === materialNo)
    return (it?.lines || []).map((l) => mapScheduleLine(l, it.uom))
  },

  async getConfirmData({ scheduleNo, fromDate, toDate, storageLocation = '' }) {
    if (!scheduleNo || scheduleNo === 'undefined') {
      throw new Error('No schedule number provided')
    }
    await delay(300)
    const a = findAgreement(scheduleNo)
    if (!a) return []
    let rows = a.items.flatMap((it) => it.lines.map((l) => mapConfirmRow(a, it, l)))
    if (fromDate) rows = rows.filter((r) => r.deliveryDateRaw >= isoToSap8(fromDate))
    if (toDate)   rows = rows.filter((r) => r.deliveryDateRaw <= isoToSap8(toDate))
    if (storageLocation.trim()) rows = rows.filter((r) => r.storageLocation === storageLocation.trim())
    return rows
  },

  async submitConfirm(scheduleNo, selectedRows) {
    if (!scheduleNo || scheduleNo === 'undefined') {
      throw new Error('No schedule number provided')
    }
    await delay(500)
    const a = findAgreement(scheduleNo)
    if (!a) throw new Error(`Agreement ${scheduleNo} not found`)
    selectedRows.forEach((row) => {
      const it = a.items.find((i) => i.itemNo === row.itemNo)
      const line = it?.lines.find((l) => l.schLineNo === row.scheduleLine)
      if (line) {
        line.confkey = 'X'
        line.confirmedQty = row.confirmedQty || row.requiredQty
      }
    })
    console.info('[mock] submitConfirm', scheduleNo, selectedRows.length, 'line(s)')
    return {}
  },
}

export default scheduleReleaseApi