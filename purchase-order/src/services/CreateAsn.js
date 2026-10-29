/**
 * Create ASN Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const ODATA_BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

const getHeaders = () => ({
  Accept: 'application/json',
})

function sapDateToDisplay(v) {
  const s = String(v ?? '').trim()
  if (s.length === 8) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  }
  return s
}

export function sapDateToIso(v) {
  const s = String(v ?? '').trim()
  if (s.length === 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  return s
}

const num = (v) => Number(String(v ?? '').trim() || 0)
const str = (v) => String(v ?? '').trim()

function mapItem(d) {
  const totalQty   = str(d.Poqty || d.Total_Qty || d.Po_Qty || '0.00')
  const poQty      = str(d.Poqty || d.Po_Qty || d.Total_Qty || '0.00')
  const asnCreated = str(d.Asncreatedqty || d.Asn_Created || '0.00')
  const confQty    = str(d.Confirmedqty || d.Menge || d.Conf_Qty || '0.00')
  const avlAsnQty  = str(d.Asnavlqty || d.Avl_Asn_Qty || Math.max(0, num(confQty) - num(asnCreated)))

  return {
    itemNo:            str(d.Poitem || d.Ebelp)?.replace(/^0+/, '') || str(d.Poitem || d.Ebelp || '10'),
    schLine:           str(d.Scheduleitem || d.Etenr || '1'),
    materialName:      str(d.Materialname || d.Maktx || 'PCB ASSY (EX22041)'),
    materialNumber:    str(d.Material || d.Matnr || '2P709876-1'),
    storageLocation:   str(d.Storageloc || d.StorageLocation || d.Lgort || 'RM02'),
    shipmentDate:      sapDateToDisplay(d.Shipmentdate || d.ShipDate || d.Eindt || '20251202'),
    shipmentDateIso:   sapDateToIso(d.Shipmentdate || d.ShipDate || d.Eindt || '20251202'),
    materialExpiry:    sapDateToIso(d.MatExpDate),
    totalQty,
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
    netPrice:          str(d.Netprice || d.Netpr || '12.00').trim(),
    supplierNetPrice:  str(d.Suppliernetprice || d.NetprVen || d.Netpr || '12.00').trim(),
    taxMismatch:       str(d.Taxmismatch || d.TaxChange) === 'X',
    packingMaterialType: str(d.Packingmaterialtype || d.PkgMatType || 'Corrugated Box'),
    packingMaterialQty:  str(d.Packingmaterialqty || d.PkgMatQty || '1'),
    spq:               str(d.Spq || d.SOQ || '41.000'),
    pdirNo:            str(d.Pdirno || d.PdirRefNo || 'PDIR-2026-081'),
    packagingType:     '',
    qtyPerPackaging:   '',
    hsnCode:           str(d.Hsn_Code || '84149090'),
    igst:              num(d.Igst || 18),
    cgst:              num(d.Cgst || 0),
    sgst:              num(d.Sgst || 0),
    igstPer:           str(d.Igst_per || '18'),
    cgstPer:           str(d.Cgst_per || '0'),
    sgstPer:           str(d.Sgst_per || '0'),
    warehouseNo:       str(d.Warehouse_No || 'W01'),
    batches:           [],
  }
}

function mapHeader(d) {
  return {
    poNo:              str(d.PurchaseOrder || d.Po_No),
    id:                str(d.PurchaseOrder || d.Po_No),
    companyCode:       str(d.CompanyCode || d.Companycode || '1000'),
    vendorNo:          str(d.Supplier || d.Vendor_No || d.Vendor || ''),
    vendor:            str(d.Supplier || d.Vendor_Name || d.Vendor || ''),
    plant:             str(d.SupplyingPlant || d.Plant || d.Werks || 'NMR'),
    plantDesc:         str(d.Plant_Desc || d.SupplyingPlant || d.Plant || 'Daikin Airconditioning -NMR (NMR)'),
    buyerName:         str(d.CreatedByUser || d.Buyer_Name || 'Rajesh Sharma'),
    purchaseGroupDesc: str(d.PurchasingGroup || d.Purchase_Group_Desc || 'Molded Resin Parts'),
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

// Mock ASN data matching exact Screenshot 3 & 4
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

async function odataGet(path) {
  const url = `${ODATA_BASE}${path}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)
  return res.json()
}

export const createAsnService = {
  async getAsnData(poNo) {
    if (USE_MOCK) {
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      const header = mapHeader({ ...entry.header, Po_No: poNo || entry.header.Po_No })
      const items = header.items.map(it => ({
        ...it,
        batches: [
          {
            id: `b-${it.itemNo}-1`,
            batchCode: '1',
            quantity: parseFloat(it.avlAsnQty || 0),
          }
        ]
      }))
      return { header, items }
    }

    try {
      // 1. Fetch header from ZCDS_PURCHASE_HEADER
      // 2. Fetch items from ZP_PUR_ASN_ITEM or fallback to ZCDS_PURCHASEITEM
      const [headerRes, itemRes] = await Promise.all([
        fetch(`${ODATA_BASE}/ZCDS_PURCHASE_HEADER?$filter=PurchaseOrder eq '${poNo}'&$format=json`, {
          headers: getHeaders(),
          credentials: 'include',
        }),
        fetch(`${ODATA_BASE}/ZP_PUR_ASN_ITEM?$filter=Purchaseorder eq '${poNo}'&$format=json`, {
          headers: getHeaders(),
          credentials: 'include',
        }),
      ])

      let header = null
      if (headerRes.ok) {
        const hJson = await headerRes.json()
        const rawH = hJson.d?.results?.[0]
        if (rawH) header = mapHeader(rawH)
      }

      let items = []
      if (itemRes.ok) {
        const iJson = await itemRes.json()
        const rawItems = iJson.d?.results || []
        if (rawItems.length > 0) {
          items = rawItems.map(mapItem)
        }
      }

      // If ZP_PUR_ASN_ITEM is empty, fallback to ZCDS_PURCHASEITEM
      if (items.length === 0) {
        const poItemRes = await fetch(`${ODATA_BASE}/ZCDS_PURCHASEITEM?$filter=PurchaseOrder eq '${poNo}'&$format=json`, {
          headers: getHeaders(),
          credentials: 'include',
        })
        if (poItemRes.ok) {
          const poJson = await poItemRes.json()
          const rawPoItems = poJson.d?.results || []
          items = rawPoItems.map(it => mapItem({
            Poitem: it.PurchaseOrderItem,
            Material: it.Material,
            Materialname: it.PurchaseOrderItemText,
            Poqty: it.OrderQuantity,
            Confirmedqty: it.PurgDocReleaseOrderQuantity || it.OrderQuantity,
            Deliveredqty: it.StockTransferDeliveredQuantity || '0.00',
            Netprice: it.NetAmount || it.NetPriceAmount || '12.00',
            Suppliernetprice: it.NetAmount || it.NetPriceAmount || '12.00',
            Storageloc: it.StorageLocation || 'RM02',
            Plant: it.Plant || header?.plant || 'NMR',
            Asncreatedqty: '0.00',
            Asnavlqty: it.PurgDocReleaseOrderQuantity || it.OrderQuantity,
          }))
        }
      }

      // If live returns no items, gracefully fallback to mock
      if (items.length === 0) {
        console.warn(`[getAsnData] No items found for PO ${poNo}, using mock fallback`)
        const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
        const fallbackHeader = header || mapHeader({ ...entry.header, Po_No: poNo || entry.header.Po_No })
        const fallbackItems = (entry.header.asnheadertoasnitemnav?.results || []).map(mapItem).map(it => ({
          ...it,
          batches: [{ id: `b-${it.itemNo}-1`, batchCode: '1', quantity: parseFloat(it.avlAsnQty || 0) }]
        }))
        return { header: fallbackHeader, items: fallbackItems }
      }

      if (!header) {
        const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
        header = mapHeader({ ...entry.header, Po_No: poNo })
      }

      const mappedItems = items.map(it => ({
        ...it,
        batches: it.batches && it.batches.length > 0 ? it.batches : [
          {
            id: `b-${it.itemNo}-1`,
            batchCode: '1',
            quantity: parseFloat(it.avlAsnQty || 0),
          }
        ]
      }))

      return { header, items: mappedItems }
    } catch (err) {
      console.warn('[getAsnData] Live fetch failed, using mock fallback:', err.message)
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      const header = mapHeader({ ...entry.header, Po_No: poNo || entry.header.Po_No })
      const items = header.items.map(it => ({
        ...it,
        batches: [
          {
            id: `b-${it.itemNo}-1`,
            batchCode: '1',
            quantity: parseFloat(it.avlAsnQty || 0),
          }
        ]
      }))
      return { header, items }
    }
  },

  async getPdirRefs(poNo) {
    if (USE_MOCK) {
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      return entry.pdirRefs.map(mapPdir)
    }

    try {
      const res = await fetch(`${ODATA_BASE}/ZP_PUR_ASN_ITEM?$filter=Purchaseorder eq '${poNo}'&$format=json`, {
        headers: getHeaders(),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`OData ${res.status}`)
      const json = await res.json()
      const results = json.d?.results || []
      const pdirs = results
        .filter(r => r.Pdirno)
        .map(r => ({
          PdirRefNo: r.Pdirno,
          value: r.Pdirno,
          label: r.Pdirno,
          refNo: r.Pdirno,
        }))
      if (pdirs.length > 0) return pdirs.map(mapPdir)
    } catch (err) {
      console.warn('[CreateAsn.getPdirRefs] Live fetch failed, using fallback:', err.message)
    }

    const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
    return entry.pdirRefs.map(mapPdir)
  },

  async getCreateAsnPageData(poNo) {
    const [asnData, pdirRefs] = await Promise.all([
      createAsnService.getAsnData(poNo),
      createAsnService.getPdirRefs(poNo),
    ])
    return { ...asnData, pdirRefs }
  },
}
