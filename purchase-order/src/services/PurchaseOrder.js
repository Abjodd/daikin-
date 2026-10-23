/**
 * Purchase Order API Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const BASE = 'https://my444263.s4hana.cloud.sap/sap/opu/odata/sap/ZSB_PURCAHSE'

export function sapDateToDisplay(s) {
  if (!s || s === '00000000') return ''
  const clean = String(s).replace(/-/g, '')
  if (clean.length === 8) {
    const y = clean.slice(0, 4)
    const m = clean.slice(4, 6)
    const d = clean.slice(6, 8)
    const dt = new Date(`${y}-${m}-${d}`)
    return isNaN(dt) ? s : dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }
  return s
}

export function sapDateToIso(s) {
  if (!s || s === '00000000') return ''
  const clean = String(s).replace(/-/g, '')
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  return s
}

function trimNum(s) {
  if (s === null || s === undefined || s === '') return '0.00'
  const n = parseFloat(String(s).trim())
  return isNaN(n) ? '0.00' : n.toFixed(2)
}

const str = (v) => String(v ?? '').trim()

// Mock PO Headers matching exact Daikin Demo screenshots
const MOCK_PO_HEADERS = [
  {
    Po_No: '7000037175',
    Plant: 'NMR',
    Plant_Desc: 'Daikin Airconditioning -NMR (NMR)',
    Po_Date: '20260818',
    UpdatedBy: 'Manual',
    Vendor_Name: 'Kunstocom(India) Ltd',
    Vendor_No: 'V-100234',
    Currency: 'INR',
    Amount: '145320.00',
    Status: 'Confirmed',
    Buyer_Name: 'Rajesh Sharma',
    Purchase_Org: '1000',
    Purchase_OrgDesc: 'Daikin India Purchasing',
    Purchase_Group: '001',
    Purchase_Group_Desc: 'Molded Resin Parts',
    Order_Type: 'NB',
    Order_Type_Desc: 'Standard PO',
    Item_Count: '1',
    Upcoming_Del_Date: '20260824',
    ValidFrom: '20260818',
    ValidTo: '20261231',
    PoType: 'Standard',
    Po_Flag: '',
    Asn_Flag: 'X',
  },
  {
    Po_No: '8501000152',
    Plant: 'SR01',
    Plant_Desc: 'Sri City FG',
    Po_Date: '20260814',
    UpdatedBy: 'Manual',
    Vendor_Name: 'Kunstocom(India) Ltd',
    Vendor_No: 'V-100234',
    Currency: 'INR',
    Amount: '235000.00',
    Status: 'Partially Confirmed',
    Buyer_Name: 'Amit Verma',
    Purchase_Org: '1000',
    Purchase_OrgDesc: 'Daikin India Purchasing',
    Purchase_Group: '002',
    Purchase_Group_Desc: 'Coils & Heat Exchangers',
    Order_Type: 'NB',
    Order_Type_Desc: 'Standard PO',
    Item_Count: '2',
    Upcoming_Del_Date: '20260828',
    ValidFrom: '20260814',
    ValidTo: '20261231',
    PoType: 'Standard',
    Po_Flag: '',
    Asn_Flag: 'X',
  },
  {
    Po_No: '8501000151',
    Plant: 'SR01',
    Plant_Desc: 'Sri City FG',
    Po_Date: '20260814',
    UpdatedBy: 'Manual',
    Vendor_Name: 'Kunstocom(India) Ltd',
    Vendor_No: 'V-100234',
    Currency: 'INR',
    Amount: '310000.00',
    Status: 'Confirmed',
    Buyer_Name: 'Amit Verma',
    Purchase_Org: '1000',
    Purchase_OrgDesc: 'Daikin India Purchasing',
    Purchase_Group: '002',
    Purchase_Group_Desc: 'Coils & Heat Exchangers',
    Order_Type: 'NB',
    Order_Type_Desc: 'Standard PO',
    Item_Count: '2',
    Upcoming_Del_Date: '20260830',
    ValidFrom: '20260814',
    ValidTo: '20261231',
    PoType: 'Standard',
    Po_Flag: '',
    Asn_Flag: 'X',
  },
  {
    Po_No: '7000037174',
    Plant: 'NMR',
    Plant_Desc: 'Daikin Airconditioning -NMR',
    Po_Date: '20260811',
    UpdatedBy: 'Manual',
    Vendor_Name: 'Kunstocom(India) Ltd',
    Vendor_No: 'V-100234',
    Currency: 'INR',
    Amount: '118000.00',
    Status: 'Confirmation Required',
    Buyer_Name: 'Sanjay Gupta',
    Purchase_Org: '1000',
    Purchase_OrgDesc: 'Daikin India Purchasing',
    Purchase_Group: '003',
    Purchase_Group_Desc: 'Molded Plastics',
    Order_Type: 'NB',
    Order_Type_Desc: 'Standard PO',
    Item_Count: '1',
    Upcoming_Del_Date: '20260905',
    ValidFrom: '20260811',
    ValidTo: '20261231',
    PoType: 'Standard',
    Po_Flag: '',
    Asn_Flag: '',
  },
]

const MOCK_PO_ITEMS = {
  '7000037175': [
    {
      Po_No: '7000037175',
      Item_No: '00010',
      Material_No: '1P302790-1 G',
      Material_Desc: 'LEFT SIDE PANEL(RESIN)',
      Hsn_Code: '84159000',
      Quantity: '1500.00',
      Confirm_Qty: '1500.00',
      Delivered_Qty: '0.00',
      Total_Amount: '96.88',
      Confirm_Status: 'Confirmed',
      Uom: 'NO',
      Delivery_Date: '20260824',
      Plant: 'NMR',
      Plant_Desc: 'Daikin Airconditioning -NMR (NMR)',
      Currency: 'INR',
      Igst: '18',
      Cgst: '0',
      Sgst: '0',
      Asn_Created: '0.00',
      Pending_Qty: '1500.00',
      StorageLocation: 'RM02',
      Warehouse_No: 'W01',
      PkgMatQty: '1',
      PkgMatType: 'Corrugated Box',
      SOQ: '50',
    },
  ],
  '8501000152': [
    {
      Po_No: '8501000152',
      Item_No: '00010',
      Material_No: '2P709876-1',
      Material_Desc: 'PCB ASSY (EX22041)',
      Hsn_Code: '84149090',
      Quantity: '10.00',
      Confirm_Qty: '10.00',
      Delivered_Qty: '0.00',
      Total_Amount: '12.00',
      Confirm_Status: 'Partially Confirmed',
      Uom: 'NO',
      Delivery_Date: '20260828',
      Plant: 'SR01',
      Plant_Desc: 'Sri City FG',
      Currency: 'INR',
      Igst: '18',
      Cgst: '0',
      Sgst: '0',
      Asn_Created: '2.00',
      Pending_Qty: '8.00',
      StorageLocation: 'RM02',
      Warehouse_No: 'W01',
      PkgMatQty: '1',
      PkgMatType: 'Corrugated Box',
      SOQ: '41',
    },
    {
      Po_No: '8501000152',
      Item_No: '00020',
      Material_No: '2P709876-1',
      Material_Desc: 'PCB ASSY (EX22041)',
      Hsn_Code: '84149090',
      Quantity: '15.00',
      Confirm_Qty: '15.00',
      Delivered_Qty: '0.00',
      Total_Amount: '12.00',
      Confirm_Status: 'Confirmed',
      Uom: 'NO',
      Delivery_Date: '20260828',
      Plant: 'SR01',
      Plant_Desc: 'Sri City FG',
      Currency: 'INR',
      Igst: '18',
      Cgst: '0',
      Sgst: '0',
      Asn_Created: '2.00',
      Pending_Qty: '13.00',
      StorageLocation: 'RM02',
      Warehouse_No: 'W01',
      PkgMatQty: '1',
      PkgMatType: 'Corrugated Box',
      SOQ: '41',
    },
  ],
  '8501000151': [
    {
      Po_No: '8501000151',
      Item_No: '00010',
      Material_No: 'DK-COIL-3320',
      Material_Desc: 'Condenser Coil Al-Fin Heat Exchanger',
      Hsn_Code: '84189900',
      Quantity: '80.00',
      Confirm_Qty: '80.00',
      Delivered_Qty: '20.00',
      Total_Amount: '6200.00',
      Confirm_Status: 'Confirmed',
      Uom: 'NO',
      Delivery_Date: '20260830',
      Plant: 'SR01',
      Plant_Desc: 'Sri City FG',
      Currency: 'INR',
      Igst: '18',
      Cgst: '0',
      Sgst: '0',
      Asn_Created: '20.00',
      Pending_Qty: '60.00',
      StorageLocation: 'RM01',
      Warehouse_No: 'W02',
      PkgMatQty: '4',
      PkgMatType: 'Steel Pallets',
      SOQ: '20',
    },
  ],
  '7000037174': [
    {
      Po_No: '7000037174',
      Item_No: '00010',
      Material_No: 'DK-PLAS-5501',
      Material_Desc: 'Front Grille ABS Plastic Molding',
      Hsn_Code: '39269099',
      Quantity: '300.00',
      Confirm_Qty: '0.00',
      Delivered_Qty: '0.00',
      Total_Amount: '120.00',
      Confirm_Status: 'Confirmation Required',
      Uom: 'NO',
      Delivery_Date: '20260905',
      Plant: 'NMR',
      Plant_Desc: 'Daikin Airconditioning -NMR',
      Currency: 'INR',
      Igst: '18',
      Cgst: '0',
      Sgst: '0',
      Asn_Created: '0.00',
      Pending_Qty: '300.00',
      StorageLocation: 'RM03',
      Warehouse_No: 'W01',
      PkgMatQty: '6',
      PkgMatType: 'Corrugated Box',
      SOQ: '50',
    },
  ],
}

const MOCK_SCHEDULE_LINES = [
  { Ebeln: '7000037175', Ebelp: '00010', Etenr: '1', Eindt: '20260824', Menge: '1500.00', Wemng: '0.00', Bmeng: '1500.00', Uom: 'NO' },
  { Ebeln: '8501000152', Ebelp: '00010', Etenr: '1', Eindt: '20260828', Menge: '10.00',   Wemng: '0.00', Bmeng: '10.00',   Uom: 'NO' },
  { Ebeln: '8501000152', Ebelp: '00020', Etenr: '1', Eindt: '20260828', Menge: '15.00',   Wemng: '0.00', Bmeng: '15.00',   Uom: 'NO' },
  { Ebeln: '8501000151', Ebelp: '00010', Etenr: '1', Eindt: '20260830', Menge: '80.00',   Wemng: '20.00', Bmeng: '80.00',  Uom: 'NO' },
  { Ebeln: '7000037174', Ebelp: '00010', Etenr: '1', Eindt: '20260905', Menge: '300.00',  Wemng: '0.00', Bmeng: '0.00',   Uom: 'NO' },
]

const MOCK_CONFIRM_ROWS = [
  {
    Po_No: '7000037175',
    Item_No: '00010',
    Schedule_Line: '1',
    Vendor_No: 'V-100234',
    Material_No: '1P302790-1 G',
    Material_Desc: 'LEFT SIDE PANEL(RESIN)',
    PO_Quantity: '1500.00',
    Conf_Quantity: '1500.00',
    Del_Quantity: '0.00',
    Asn_Quantity: '0.00',
    Conf_Date: '20260824',
    DispDate: '20260824',
    ShipDate: '20260823',
    StorageBin: 'BIN-A1',
  },
]

async function odataGet(path) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`OData ${res.status}: ${url}`)
  const json = await res.json()
  return json.d
}

function sapODataDate(value) {
  if (!value) return ''

  const match = /\/Date\((\d+)\)\//.exec(value)

  if (!match) return value

  const date = new Date(Number(match[1]))

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}

function mapHeader(raw) {
  return {
    id: str(raw.PurchaseOrder),

    poNo: str(raw.PurchaseOrder),

    plant: str(raw.SupplyingPlant),

    plantName: str(raw.SupplyingPlant),

    date: sapODataDate(raw.PurchaseOrderDate),

    type: str(raw.PurchaseOrderType),

    vendor: str(raw.Supplier),

    vendorNo: str(raw.Supplier),

    currency: 'INR',

    amount: '',

    status: str(raw.PurchaseOrderType),

    buyerName: str(raw.CreatedByUser),

    purchaseOrg: str(raw.PurchasingOrganization),

    purchaseOrgDesc: '',

    purchaseGroup: str(raw.PurchasingGroup),

    purchaseGroupDesc: '',

    orderType: str(raw.PurchaseOrderType),

    orderTypeDesc: '',

    itemCount: '0',

    upcomingDelDate: '',

    validFrom: sapODataDate(raw.CreationDate),

    validTo: '',

    poType: str(raw.PurchaseOrderType),

    poFlag: '',

    asnFlag: ''
  }
}
function mapPoItem(raw) {
  return {
    poNo: str(raw.PurchaseOrder),

    itemNo: str(raw.PurchaseOrderItem),

    ebelp: str(raw.PurchaseOrderItem),

    materialNumber: str(raw.Material),

    materialName: str(raw.PurchaseOrderItemText),

    hsnCode: str(raw.CommodityCode),

    poQty: trimNum(raw.OrderQuantity),

    confirmQty: trimNum(raw.PurgDocReleaseOrderQuantity),

    deliveredQty: trimNum(raw.StockTransferDeliveredQuantity),

    unitPrice: trimNum(raw.NetPriceAmount),

    totalAmount: trimNum(raw.NetAmount),

    currency: str(raw.DocumentCurrency),

    deliveryUnit: str(raw.PurchaseOrderQuantityUnit),

    storageLocation: str(raw.StorageLocation),

    plant: str(raw.Plant),

    plantDesc: str(raw.Plant),

    pendingQty: trimNum(raw.OrderQuantity),

    status:
      raw.IsCompletelyDelivered
        ? 'Completed'
        : raw.PurgItemIsBlockedForDelivery
        ? 'Blocked'
        : raw.PurgDocReleaseOrderQuantity > 0
        ? 'Partially Confirmed'
        : 'Confirmation Required',

    deliveryDate: raw.GoodsReceiptLatestCreationDate
      ? sapDateToDisplay(raw.GoodsReceiptLatestCreationDate)
      : '',

    warehouseNo: '',

    igst: '',
    cgst: '',
    sgst: '',

    asnCreated: '0.00',

    scheduleLines: [],
  }
}

function mapPoDetail(header, items = []) {
  return {
    id: str(header.PurchaseOrder),

    poNo: str(header.PurchaseOrder),

    vendorNo: str(header.Supplier),

    vendor: str(header.Supplier),

    date: sapODataDate(header.PurchaseOrderDate),

    plant: str(header.SupplyingPlant),

    plantDesc: str(header.SupplyingPlant),

    buyerName: str(header.CreatedByUser),

    purchaseOrg: str(header.PurchasingOrganization),

    purchaseGroup: str(header.PurchasingGroup),

    orderType: str(header.PurchaseOrderType),

    status: str(header.PurchaseOrderType),

    itemCount: String(items.length),

    currency: 'INR',

    amount: items
      .reduce(
        (sum, item) =>
          sum + Number(item.NetAmount || 0),
        0
      )
      .toFixed(2),

    items: items.map(mapPoItem)
  }
}
function mapConfirmRow(raw) {
  return {
    poNo:            str(raw.Po_No),
    itemNo:          str(raw.Item_No),
    scheduleLine:    str(raw.Schedule_Line),
    vendorNo:        str(raw.Vendor_No),
    materialNo:      str(raw.Material_No),
    materialDesc:    str(raw.Material_Desc),
    poQty:           str(raw.PO_Quantity || raw.Po_Qty || ''),
    confirmedQty:    str(raw.Conf_Quantity || raw.Conf_Qty || '0'),
    delQty:          str(raw.Del_Quantity || raw.Del_Qty || ''),
    asnQty:          str(raw.Asn_Quantity || raw.Asn_Qty || ''),
    confDate:        str(raw.Conf_Date),
    confDateDisplay: sapDateToDisplay(raw.Conf_Date),
    dispDate:        str(raw.DispDate),
    dispDateDisplay: sapDateToDisplay(raw.DispDate),
    shipDate:        str(raw.ShipDate),
    shipDateDisplay: sapDateToDisplay(raw.ShipDate),
    storageBin:      str(raw.StorageBin),
  }
}

function mapLineItem(raw) {
  return {
    ebeln:            str(raw.Ebeln),
    ebelp:            str(raw.Ebelp),
    etenr:            str(raw.Etenr)?.trim(),
    scheduleLine:     str(raw.Etenr)?.trim(),
    deliveryDate:     sapDateToDisplay(raw.Eindt),
    deliverySchedule: trimNum(raw.Menge),
    scheduleQty:      trimNum(raw.Menge),
    deliveredQty:     trimNum(raw.Wemng),
    confirmedQty:     trimNum(raw.Bmeng),
    unit:             str(raw.Uom) || 'NO',
    schLineNo:        str(raw.Etenr)?.trim(),
  }
}

function mapPdirRef(raw) {
  const refNo = str(raw.Pdir_Ref_No || raw.refNo || raw.PdirRefNo)
  return {
    ebeln:   str(raw.Ebeln),
    ebelp:   str(raw.Ebelp),
    refNo:   refNo,
    value:   refNo,
    label:   refNo,
    refDate: sapDateToDisplay(raw.Pdir_Ref_Date),
  }
}

export const purchaseOrderApi = {
  async fetchAllSuppliers() {

  const res = await fetch(
    `${BASE}/ZCDS_PURCHASE_HEADER?$format=json`,
    {
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include'
    }
  )

  if (!res.ok) {
    throw new Error('Failed to load suppliers')
  }

  const json = await res.json()

  return [
    ...new Map(
      (json.d?.results || []).map(item => [
        item.Supplier,
        {
          lifnr: item.Supplier,
          name: item.Supplier
        }
      ])
    ).values()
  ]
},

  async listHeaders({ vendorNo = '' } = {}) {

  let url =
    `${BASE}/ZCDS_PURCHASE_HEADER?$format=json`

  if (vendorNo) {
    url += `&$filter=Supplier eq '${vendorNo}'`
  }

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json'
    },
    credentials: 'include'
  })

  if (!res.ok) {
    throw new Error('Failed to load purchase orders')
  }

  const json = await res.json()

  return (json.d?.results || []).map(mapHeader)
},

  async getHeader(poNo, vendorNo = '') {
    if (USE_MOCK) {
      const h = MOCK_PO_HEADERS.find(item => item.Po_No === poNo) || MOCK_PO_HEADERS[0]
      return mapHeader(h)
    }

    const key = `Po_No='${poNo}',Vendor_No='${vendorNo}'`
    const data = await odataGet(`/PO_HEADERSet(${key})`)
    return mapHeader(data)
  },

  async getPoDetail(poNo) {

  const [headerRes, itemRes] = await Promise.all([
    fetch(
      `${BASE}/ZCDS_PURCHASE_HEADER?$filter=PurchaseOrder eq '${poNo}'&$format=json`,
      {
        headers: {
          Accept: 'application/json'
        },
        credentials: 'include'
      }
    ),

    fetch(
      `${BASE}/ZCDS_PURCHASEITEM?$filter=PurchaseOrder eq '${poNo}'&$format=json`,
      {
        headers: {
          Accept: 'application/json'
        },
        credentials: 'include'
      }
    )
  ])

  if (!headerRes.ok || !itemRes.ok) {
    throw new Error('Failed to load PO details')
  }

  const headerJson = await headerRes.json()
  const itemJson = await itemRes.json()

  const header = headerJson.d?.results?.[0]

  if (!header) {
    throw new Error('PO not found')
  }

  return mapPoDetail(
    header,
    itemJson.d?.results || []
  )
},

  async getLineItems(poNo, ebelp) {
    if (USE_MOCK) {
      const lines = MOCK_SCHEDULE_LINES.filter(l => l.Ebeln === poNo && (!ebelp || l.Ebelp === ebelp))
      if (lines.length > 0) return lines.map(mapLineItem)
      return [
        {
          ebeln: poNo,
          ebelp: ebelp || '00010',
          etenr: '1',
          scheduleLine: '1',
          deliveryDate: 'Aug 24, 2026',
          deliverySchedule: '1500.00',
          scheduleQty: '1500.00',
          deliveredQty: '0.00',
          confirmedQty: '1500.00',
          unit: 'NO',
          schLineNo: '1',
        }
      ]
    }

    const f = `Ebeln%20eq%20%27${poNo}%27%20and%20Ebelp%20eq%20%27${ebelp}%27`
    const data = await odataGet(`/Po_LineitemSet?$filter=${f}`)
    return (data.results || []).map(mapLineItem)
  },

  async getPdirRefs(poNo) {
    if (USE_MOCK) {
      return [
        { ebeln: poNo, ebelp: '00010', refNo: 'PDIR-2026-081', refDate: 'Aug 18, 2026' },
        { ebeln: poNo, ebelp: '00020', refNo: 'PDIR-2026-082', refDate: 'Aug 18, 2026' },
      ].map(mapPdirRef)
    }

    const f = `Ebeln%20eq%20%27${poNo}%27`
    const data = await odataGet(`/Pdir_ref_noSet?$filter=${f}`)
    return (data.results || []).map(mapPdirRef)
  },

  async getConfirmData(poNo) {
    if (USE_MOCK) {
      return MOCK_CONFIRM_ROWS.map(mapConfirmRow)
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')
    const filter = `%20Po_No%20eq%20%27${poNo}%27`
    const data = await odataGet(`/PoConfirmSet?$filter=${filter}`)
    return (data.results || []).map(mapConfirmRow)
  },

  async submitConfirm(poNo, selectedRows, vendorNo = '') {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400))
      return { success: true }
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')

    const csrfRes = await fetch(
      `${BASE}/PO_HEADERSet(Po_No='${poNo}',Vendor_No='${vendorNo}')`,
      {
        method: 'GET',
        headers: {
          'X-CSRF-Token': 'Fetch',
          Accept: 'application/json',
        },
        credentials: 'include',
      }
    )
    const token = csrfRes.headers.get('X-CSRF-Token') || ''

    const res = await fetch(`${BASE}/PO_HEADERSet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': token,
      },
      credentials: 'include',
      body: JSON.stringify({
        Po_No:    poNo,
        Vendor_No: vendorNo,
        headertopoconfirmnav: {
          results: selectedRows.map(row => ({
            Po_No:         poNo,
            Item_No:       row.itemNo,
            Schedule_Line: row.scheduleLine,
            Vendor_No:     vendorNo,
            Material_No:   row.materialNo,
            Conf_Date:     row.confDate,
            Conf_Quantity: String(row.confirmedQty),
            Del_Quantity:  String(row.delQty),
            StorageBin:    row.storageBin || '',
          })),
        },
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      let msg = `POST ${res.status}`
      try { msg = JSON.parse(t)?.error?.message?.value || msg } catch { msg = t.slice(0, 200) || msg }
      throw new Error(msg)
    }

    return res.status === 204 ? {} : res.json()
  },
}
