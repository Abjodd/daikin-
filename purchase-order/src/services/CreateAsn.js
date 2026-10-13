/**
 * Create ASN Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = true

const ODATA_BASE = '/sap/opu/odata/shiv/NW_SUPP_PORTAL_PO_APP_SRV'

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
  const totalQty   = str(d.Total_Qty || d.Po_Qty)
  const poQty      = str(d.Po_Qty || d.Total_Qty)
  const asnCreated = str(d.Asn_Created || '0.00')
  const confQty    = str(d.Menge || d.Conf_Qty || '0.00')
  const avlAsnQty  = str(d.Avl_Asn_Qty || Math.max(0, num(confQty) - num(asnCreated)))

  return {
    itemNo:            str(d.Ebelp)?.replace(/^0+/, '') || str(d.Ebelp),
    schLine:           str(d.Etenr || '1'),
    materialName:      str(d.Maktx || 'PCB ASSY (EX22041)'),
    materialNumber:    str(d.Matnr || '2P709876-1'),
    storageLocation:   str(d.StorageLocation || d.Lgort || 'RM02'),
    shipmentDate:      sapDateToDisplay(d.ShipDate || d.Eindt || '20251202'),
    shipmentDateIso:   sapDateToIso(d.ShipDate || d.Eindt || '20251202'),
    materialExpiry:    sapDateToIso(d.MatExpDate),
    totalQty,
    totalUnit:         str(d.Meins || 'NO'),
    confQty,
    confUnit:          str(d.Meins || 'NO'),
    deliveredQty:      str(d.DelQty || '0.00'),
    deliveredUnit:     str(d.Meins || 'NO'),
    asnCreated,
    avlAsnQty,
    vendorReturnQty:   str(d.VendorReturnQty || ''),
    shortGrnQty:       str(d.ShortGrnQty || ''),
    fgStock:           avlAsnQty,
    netPrice:          str(d.Netpr || '12.00').trim(),
    supplierNetPrice:  str(d.NetprVen || d.Netpr || '12.00').trim(),
    taxMismatch:       str(d.TaxChange) === 'X',
    packingMaterialType: str(d.PkgMatType || 'Corrugated Box'),
    packingMaterialQty:  str(d.PkgMatQty || '1'),
    spq:               str(d.SOQ || '41.000'),
    pdirNo:            str(d.PdirRefNo || 'PDIR-2026-081'),
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
    poNo:              str(d.Po_No),
    id:                str(d.Po_No),
    plant:             str(d.Werks || 'NMR'),
    plantDesc:         str(d.Plant_Desc || 'Daikin Airconditioning -NMR (NMR)'),
    buyerName:         str(d.Buyer_Name || 'Rajesh Sharma'),
    purchaseGroupDesc: str(d.Purchase_Group_Desc || 'Molded Resin Parts'),
    currency:          str(d.Currency || 'INR'),
    draftAsn:          d.DraftAsn === true,
    asnNum:            str(d.AsnNum),
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

    const json = await odataGet(
      `/PO_ASN_HEADERSet('${poNo}')?$expand=asnheadertoasnitemnav`
    )
    const d = json.d
    if (!d) throw new Error('No data returned for PO: ' + poNo)
    const header = mapHeader(d)
    return { header, items: header.items.filter(i => parseFloat(i.avlAsnQty || 0) > 0) }
  },

  async getPdirRefs(poNo) {
    if (USE_MOCK) {
      const entry = MOCK_ASN_DATABASE[poNo] || MOCK_ASN_DATABASE.default
      return entry.pdirRefs.map(mapPdir)
    }

    const filter = `Ebeln eq '${poNo}'`
    const json = await odataGet(
      `/Pdir_ref_noSet?$filter=${encodeURIComponent(filter)}`
    )
    return (json.d?.results || []).map(mapPdir)
  },

  async getCreateAsnPageData(poNo) {
    const [asnData, pdirRefs] = await Promise.all([
      createAsnService.getAsnData(poNo),
      createAsnService.getPdirRefs(poNo),
    ])
    return { ...asnData, pdirRefs }
  },
}
