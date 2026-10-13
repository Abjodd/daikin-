// ═══════════════════════════════════════════════════════════════
// Create ASN API — MOCK VERSION
// Same method names / item shape as the OData version. No CSRF, no auth.
// Eligible items come from CONFIRMED schedule lines in the shared mock
// store; submitting an ASN bumps `asnCreated` on those lines, so the
// remaining permissible qty (and "Delivered Qty" on the list page) update.
// ═══════════════════════════════════════════════════════════════
import { findAgreement, PDIR_REF_NOS, delay, sapDateDisplay } from './Mockdata.js'

const isoToSap8 = (iso) => (iso || '').replace(/-/g, '')

let asnSeq = 1

function buildEligibleItem(a, it, l) {
  const schLine = String(parseInt(l.schLineNo, 10))
  const avl = Math.max(0, l.confirmedQty - l.asnCreated)
  return {
    // Stable key (no array index) so user edits survive a re-fetch / filter change
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

    igst: '0', cgst: '0', sgst: '0',
    igstPer: '0', cgstPer: '9', sgstPer: '9',
    tax: '0',
    currency: 'INR',

    materialName: it.materialName,
    materialNumber: it.materialNumber,
    storageLocation: it.storageLocation,
    warehouseNo: 'W01',
    hsn: it.hsnCode,

    shipmentDate: sapDateDisplay(l.date),
    materialExpiry: '',

    totalQty: String(l.qty),
    totalUnit: it.uom,
    confQty: String(l.confirmedQty),
    confUnit: it.uom,
    asnCreated: String(l.asnCreated),
    draftAsnQty: '0',
    spq: String(it.spq),

    avlAsnQty: String(avl),
    delQty: '0',
    deliveredQty: String(l.asnCreated),
    deliveredUnit: it.uom,

    netPrice: String(it.unitPrice),
    supplierNetPrice: String(it.unitPrice),

    packingMaterialQty: '1',
    packingMaterialType: '',
    packagingType: '',
    pdirNo: '',

    fgStock: '',
    qtyPerPackaging: '',
    taxMismatch: false,
    batches: [],
  }
}

export const createAsnApi = {
  async getEligibleItems({ scheduleNo, fromDate, toDate, storageLocation = '' } = {}) {
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

  async submitAsn({ scheduleNo, plant, invoiceNumber, invoiceDate, invoiceAmount, totalPacking, items }) {
    await delay(700)
    const a = findAgreement(scheduleNo)
    if (!a) throw new Error(`Agreement ${scheduleNo} not found`)

    items.forEach((row) => {
      const it = a.items.find((i) => i.itemNo === row.ebelp)
      const line = it?.lines.find((l) => parseInt(l.schLineNo, 10) === parseInt(row.schLine, 10))
      if (line) line.asnCreated += parseFloat(row.avlAsnQty || '0')
    })

    const asnNum = String(3100000000 + asnSeq++)
    const fisYear = String(new Date().getFullYear())
    console.info('[mock] submitAsn', {
      scheduleNo, plant, invoiceNumber, invoiceDate, invoiceAmount, totalPacking,
      items: items.map((i) => ({
        ebelp: i.ebelp, schLine: i.schLine, qty: i.avlAsnQty, batches: i.batches,
      })),
    })
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

// Replaces services/Purchasing/PurchaseOrder/UploadAttachment.js for the mock build.
// Same call/return shape: { uploaded: number, failed: [{ name, error }] }
export async function uploadAllAttachments({ generalAttachments = [], pdirAttachments = [] } = {}) {
  const all = [...generalAttachments, ...pdirAttachments]
  await delay(300 + all.length * 150)
  return { uploaded: all.length, failed: [] }
}

export default createAsnApi