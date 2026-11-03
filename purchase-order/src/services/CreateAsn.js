/**
 * Create ASN Service
 * GET calls use the ZCDS_* views. Only lines already confirmed in ZP_PO_CONFIRM are offered.
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
import { fetchConfirmedMap, isLineConfirmed } from './PurchaseOrder.js'

export const USE_MOCK = false

const ODATA_BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

const getHeaders = () => ({
  Accept: 'application/json',
})

const num = (v) => Number(String(v ?? '').trim() || 0)
const str = (v) => String(v ?? '').trim()
const stripZeros = (v) => str(v).replace(/^0+/, '')

// Accepts '/Date(ms)/', 'YYYYMMDD' or 'YYYY-MM-DD' and returns 'YYYY-MM-DD' (or '')
export function sapDateToIso(v) {
  const s = str(v)
  const m = /\/Date\((-?\d+)/.exec(s)
  if (m) return new Date(Number(m[1])).toISOString().slice(0, 10)
  if (/^\d{8}$/.test(s) && s !== '00000000') return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

function isoToDisplay(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  })
}

function mapItem(d) {
  const shipIso    = sapDateToIso(d.Shipmentdate || d.ShipDate || d.Eindt)
  const totalQty   = str(d.Poqty || d.Total_Qty || d.Po_Qty || '0.00')
  const poQty      = str(d.Poqty || d.Po_Qty || d.Total_Qty || '0.00')
  const asnCreated = str(d.Asncreatedqty || d.Asn_Created || '0.00')
  const confQty    = str(d.Confirmedqty || d.Menge || d.Conf_Qty || '0.00')
  const avlAsnQty  = str(d.Asnavlqty || d.Avl_Asn_Qty || Math.max(0, num(confQty) - num(asnCreated)))

  return {
    itemNo:            stripZeros(d.Poitem || d.Ebelp),
    schLine:           stripZeros(d.Scheduleitem || d.Etenr) || '1',
    materialName:      str(d.Materialname || d.Maktx),
    materialNumber:    str(d.Material || d.Matnr),
    storageLocation:   str(d.Storageloc || d.StorageLocation || d.Lgort),
    shipmentDate:      isoToDisplay(shipIso),
    shipmentDateIso:   shipIso,
    materialExpiry:    sapDateToIso(d.MatExpDate),
    totalQty,
    poQty,
    totalUnit:         str(d.Meins || 'NO'),
    confQty,
    confUnit:          str(d.Meins || 'NO'),
    deliveredQty:      str(d.Deliveredqty || d.DelQty || '0.00'),
    deliveredUnit:     str(d.Meins || 'NO'),
    asnCreated,
    avlAsnQty,
    vendorReturnQty:   str(d.Vendorreturnqty || d.VendorReturnQty || ''),
    shortGrnQty:       str(d.Shortgrnqty || d.ShortGrnQty || ''),
    fgStock:           avlAsnQty,
    netPrice:          str(d.Netprice || d.Netpr || '0.00'),
    supplierNetPrice:  str(d.Suppliernetprice || d.NetprVen || d.Netprice || d.Netpr || '0.00'),
    taxMismatch:       str(d.Taxmismatch || d.TaxChange) === 'X',
    packingMaterialType: str(d.Packingmaterialtype || d.PkgMatType || 'Corrugated Box'),
    packingMaterialQty:  str(d.Packingmaterialqty || d.PkgMatQty || '1'),
    spq:               str(d.Spq || d.SOQ || ''),
    pdirNo:            str(d.Pdirno || d.PdirRefNo || ''),
    packagingType:     '',
    qtyPerPackaging:   '',
    hsnCode:           str(d.Hsn_Code || d.CommodityCode || ''),
    igst:              num(d.Igst || 0),
    cgst:              num(d.Cgst || 0),
    sgst:              num(d.Sgst || 0),
    igstPer:           str(d.Igst_per || '0'),
    cgstPer:           str(d.Cgst_per || '0'),
    sgstPer:           str(d.Sgst_per || '0'),
    warehouseNo:       str(d.Warehouse_No || ''),
    batches:           [],
  }
}

function mapHeader(d) {
  const companyCode = str(d.CompanyCode || d.Companycode || '1000')
  const companyCodeName = str(d.CompanyCodeName || d.Companycode || '')
  const vendorNo = str(d.Supplier || d.Vendor_No || d.Vendor || '')
  const vendorName = str(d.SupplierFullName || d.Vendor_Name || d.Supplier || d.Vendor || '')
  const vendorAddr = str(d.supplieraddress || d.SupplierAddress || '')
  const plant = str(d.Plant || d.SupplyingPlant || d.Werks || '')
  const plantDesc = str(d.Plantname || d.Plant_Desc || d.SupplyingPlant || d.Plant || d.Werks || '')

  return {
    poNo:              str(d.PurchaseOrder || d.Po_No),
    id:                str(d.PurchaseOrder || d.Po_No),
    companyCode,
    companyCodeName,
    vendorNo,
    vendor:            vendorName,
    vendorAddress:     vendorAddr,
    plant,
    plantDesc,
    buyerName:         str(d.CreatedByUser || d.Buyer_Name),
    purchaseGroupDesc: str(d.PurchasingGroup || d.Purchase_Group_Desc),
    currency:          str(d.DocumentCurrency || d.Currency || 'INR'),
    draftAsn:          d.DraftAsn === true,
    asnNum:            str(d.Asnnumber || d.AsnNum || ''),
    items:             (d.asnheadertoasnitemnav?.results || []).map(mapItem),
  }
}

function mapPdir(d) {
  const val = str(d.PdirRefNo || d.Pdir_Ref_No || d.RefNo || d.value || d.refNo || '')
  return {
    value: val,
    label: val,
    refNo: val,
  }
}

// Every row gets a unique rowId (item + schedule line), because one PO item can appear
// several times (one row per schedule line / batch-wise confirmation).
function finalizeItems(items) {
  return items.map((it, i) => ({
    ...it,
    rowId: `${it.itemNo}-${it.schLine}-${i}`,
    batches:
      it.batches && it.batches.length > 0
        ? it.batches
        : [{ id: `b-${it.itemNo}-${it.schLine}-1`, batchCode: '1', quantity: parseFloat(it.avlAsnQty || 0) }],
  }))
}

// Mock ASN data (only used when USE_MOCK = true)
const MOCK_ASN_DATABASE = {
  default: {
    header: {
      Po_No: '7000037175',
      Werks: 'NMR',
      Plant_Desc: 'Daikin Airconditioning -NMR (NMR)',
      Buyer_Name: 'Rajesh Sharma',
      Purchase_Group_Desc: 'Molded Resin Parts',
      Currency: 'INR',
      DraftAsn: false,
      AsnNum: '',
      asnheadertoasnitemnav: {
        results: [
          {
            Ebelp: '00010',
            Etenr: '1',
            Maktx: 'PCB ASSY (EX22041)',
            Matnr: '2P709876-1',
            StorageLocation: 'RM02',
            ShipDate: '20251202',
            Eindt: '20251202',
            Total_Qty: '10.00',
            Po_Qty: '10.00',
            Menge: '10.00',
            Meins: 'NO',
            DelQty: '0.00',
            Asn_Created: '2.00',
            Avl_Asn_Qty: '8',
            Netpr: '12.00',
            NetprVen: '12.00',
            TaxChange: '',
            PkgMatType: 'Corrugated Box',
            PkgMatQty: '1',
            SOQ: '41.000',
            PdirRefNo: 'PDIR-2026-081',
            Hsn_Code: '84149090',
            Igst: 18,
            Cgst: 0,
            Sgst: 0,
            Igst_per: '18',
            Warehouse_No: 'W01',
          },
          {
            Ebelp: '00020',
            Etenr: '1',
            Maktx: 'PCB ASSY (EX22041)',
            Matnr: '2P709876-1',
            StorageLocation: 'RM02',
            ShipDate: '20251202',
            Eindt: '20251202',
            Total_Qty: '15.00',
            Po_Qty: '15.00',
            Menge: '15.00',
            Meins: 'NO',
            DelQty: '0.00',
            Asn_Created: '2.00',
            Avl_Asn_Qty: '13',
            Netpr: '12.00',
            NetprVen: '12.00',
            TaxChange: '',
            PkgMatType: 'Corrugated Box',
            PkgMatQty: '1',
            SOQ: '41.000',
            PdirRefNo: 'PDIR-2026-082',
            Hsn_Code: '84149090',
            Igst: 18,
            Cgst: 0,
            Sgst: 0,
            Igst_per: '18',
            Warehouse_No: 'W01',
          },
        ],
      },
    },
    pdirRefs: [
      { PdirRefNo: 'PDIR-2026-081' },
      { PdirRefNo: 'PDIR-2026-082' },
      { PdirRefNo: 'PDIR-2026-083' },
    ],
  },
}

// GET helper that throws on HTTP errors and returns json.d.results
async function getResults(url) {
  const res = await fetch(url, { headers: getHeaders(), credentials: 'include' })
  if (!res.ok) throw new Error(`OData ${res.status}: ${url}`)
  const json = await res.json()
  return json.d?.results || []
}

export const createAsnService = {
  async getAsnData(poNo) {
    if (USE_MOCK) {
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      const header = mapHeader({ ...entry.header, Po_No: poNo || entry.header.Po_No })
      return { header, items: finalizeItems(header.items) }
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')

    const poFilter = encodeURIComponent(`PurchaseOrder eq '${poNo}'`)

    // Header and schedule lines are optional; the PO items and the confirmations are required.
    const [headers, poItems, schs, confirmedMap] = await Promise.all([
      getResults(`${ODATA_BASE}/ZCDS_PURCHASE_HEADER?$filter=${poFilter}&$format=json`).catch(() => []),
      getResults(`${ODATA_BASE}/ZCDS_PURCHASEITEM?$filter=${poFilter}&$format=json`),
      getResults(`${ODATA_BASE}/ZCDS_PURCHASEITEM_SCH?$filter=${poFilter}&$format=json`).catch(() => []),
      fetchConfirmedMap(poNo),
    ])

    const header = headers[0] ? mapHeader(headers[0]) : mapHeader({ PurchaseOrder: poNo })

    // One candidate per schedule line; if there are none, one per PO item.
    const lines = schs.length > 0
      ? schs
      : poItems.map(p => ({ PurchaseOrderItem: p.PurchaseOrderItem, PurchaseOrderScheduleLine: '' }))

    const rows = []
    for (const sch of lines) {
      const it = poItems.find(p => stripZeros(p.PurchaseOrderItem) === stripZeros(sch.PurchaseOrderItem))
      if (!it) continue

      // Only confirmed lines can be used for an ASN
      if (!isLineConfirmed(confirmedMap, it.PurchaseOrderItem, it.Material, sch.PurchaseOrderScheduleLine)) continue

      const orderQty = str(sch.ScheduleLineOrderQuantity || it.OrderQuantity || '0.00')
      const committed = num(sch.ScheduleLineCommittedQuantity)
      // Confirmation is status based (no quantity is stored), so a confirmed line counts in full
      const confQty = committed > 0 ? str(sch.ScheduleLineCommittedQuantity) : orderQty

      rows.push(
        mapItem({
          Poitem: it.PurchaseOrderItem,
          Scheduleitem: sch.PurchaseOrderScheduleLine,
          Material: it.Material,
          Materialname: it.PurchaseOrderItemText,
          Poqty: orderQty,
          Confirmedqty: confQty,
          Deliveredqty: sch.PrevDelivQtyOfScheduleLine || it.StockTransferDeliveredQuantity || '0.00',
          Netprice: it.NetPriceAmount || it.NetAmount || '0.00',
          Storageloc: it.StorageLocation,
          Shipmentdate: sch.ScheduleLineDeliveryDate,
          Hsn_Code: it.CommodityCode,
          Meins: it.PurchaseOrderQuantityUnit,
          Asncreatedqty: '0.00',
        })
      )
    }

    return { header, items: finalizeItems(rows) }
  },

  async getPdirRefs(poNo) {
    if (USE_MOCK) {
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      return entry.pdirRefs.map(mapPdir)
    }

    try {
      const results = await getResults(
        `${ODATA_BASE}/ZP_PUR_ASN_ITEM?$filter=${encodeURIComponent(`Purchaseorder eq '${poNo}'`)}&$format=json`
      )
      const refs = new Map()
      for (const r of results) {
        const ref = str(r.Pdirno)
        if (ref) refs.set(ref, mapPdir({ PdirRefNo: ref }))
      }
      return [...refs.values()]
    } catch (err) {
      console.warn('[CreateAsn.getPdirRefs] Live fetch failed:', err.message)
      return []
    }
  },

  async getCreateAsnPageData(poNo) {
    const [asnData, pdirRefs] = await Promise.all([
      createAsnService.getAsnData(poNo),
      createAsnService.getPdirRefs(poNo),
    ])
    return { ...asnData, pdirRefs }
  },
}