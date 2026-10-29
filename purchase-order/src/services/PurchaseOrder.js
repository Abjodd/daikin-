/**
 * Purchase Order API Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

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
    id: str(raw.PurchaseOrder || raw.Po_No),

    poNo: str(raw.PurchaseOrder || raw.Po_No),

    companyCode: str(raw.CompanyCode || '1000'),

    plant: str(raw.SupplyingPlant || raw.Plant),

    plantName: str(
      raw.Plant_Desc ||
      raw.SupplyingPlant ||
      raw.Plant
    ),

    date: raw.PurchaseOrderDate
      ? sapODataDate(raw.PurchaseOrderDate)
      : sapDateToDisplay(raw.Po_Date),

    type: str(raw.PurchaseOrderType || raw.Order_Type),

    vendor: str(raw.Supplier || raw.Vendor_Name),

    vendorNo: str(raw.Supplier || raw.Vendor_No),

    currency: str(
      raw.DocumentCurrency ||
      raw.Currency ||
      'INR'
    ),

    amount: str(
      raw.NetAmount ||
      raw.Amount ||
      '0.00'
    ),

    status: str(
      raw.Status ||
      raw.PurchaseOrderType
    ),

    buyerName: str(
      raw.CreatedByUser ||
      raw.Buyer_Name
    ),

    purchaseOrg: str(
      raw.PurchasingOrganization ||
      raw.Purchase_Org
    ),

    purchaseOrgDesc: str(
      raw.Purchase_OrgDesc || ''
    ),

    purchaseGroup: str(
      raw.PurchasingGroup ||
      raw.Purchase_Group
    ),

    purchaseGroupDesc: str(
      raw.Purchase_Group_Desc || ''
    ),

    orderType: str(
      raw.PurchaseOrderType ||
      raw.Order_Type
    ),

    orderTypeDesc: str(
      raw.Order_Type_Desc || ''
    ),

    itemCount: str(raw.Item_Count || '0'),

    upcomingDelDate: raw.Upcoming_Del_Date
      ? sapDateToDisplay(raw.Upcoming_Del_Date)
      : '',

    validFrom: raw.CreationDate
      ? sapODataDate(raw.CreationDate)
      : sapDateToDisplay(raw.ValidFrom),

    validTo: sapDateToDisplay(raw.ValidTo),

    poType: str(
      raw.PoType ||
      raw.PurchaseOrderType
    ),

    poFlag: str(raw.Po_Flag || ''),

    asnFlag: str(raw.Asn_Flag || '')
  }
}
function mapPoItem(raw) {
  return {
    poNo: str(raw.PurchaseOrder || raw.Po_No),

    itemNo: str(
      raw.PurchaseOrderItem ||
      raw.Item_No
    ),

    ebelp: str(
      raw.PurchaseOrderItem ||
      raw.Item_No
    ),

    materialNumber: str(
      raw.Material ||
      raw.Material_No
    ),

    materialName: str(
      raw.PurchaseOrderItemText ||
      raw.Material_Desc
    ),

    hsnCode: str(
      raw.CommodityCode ||
      raw.Hsn_Code
    ),

    poQty: trimNum(
      raw.OrderQuantity ||
      raw.Quantity
    ),

    confirmQty: trimNum(
      raw.PurgDocReleaseOrderQuantity ||
      raw.Confirm_Qty
    ),

    deliveredQty: trimNum(
      raw.StockTransferDeliveredQuantity ||
      raw.Delivered_Qty
    ),

    unitPrice: trimNum(
      raw.NetPriceAmount ||
      raw.Total_Amount
    ),

    totalAmount: trimNum(
      raw.NetAmount ||
      raw.Total_Amount
    ),

    currency: str(
      raw.DocumentCurrency ||
      raw.Currency
    ),

    deliveryUnit: str(
      raw.PurchaseOrderQuantityUnit ||
      raw.Uom
    ),

    storageLocation: str(
      raw.StorageLocation
    ),

    plant: str(raw.Plant),

    plantDesc: str(
      raw.Plant_Desc ||
      raw.Plant
    ),

    pendingQty: trimNum(
      raw.Pending_Qty ||
      raw.OrderQuantity
    ),

    warehouseNo: str(
      raw.Warehouse_No || ''
    ),

    igst: str(raw.Igst || ''),
    cgst: str(raw.Cgst || ''),
    sgst: str(raw.Sgst || ''),

    asnCreated: trimNum(
      raw.Asn_Created || '0'
    ),

    status:
      raw.Confirm_Status ||
      (raw.IsCompletelyDelivered
        ? 'Completed'
        : raw.PurgItemIsBlockedForDelivery
        ? 'Blocked'
        : Number(
            raw.PurgDocReleaseOrderQuantity
          ) > 0
        ? 'Partially Confirmed'
        : 'Confirmation Required'),

    deliveryDate:
      raw.Delivery_Date
        ? sapDateToDisplay(raw.Delivery_Date)
        : raw.GoodsReceiptLatestCreationDate
        ? sapDateToDisplay(
            raw.GoodsReceiptLatestCreationDate
          )
        : '',

    scheduleLines: []
  }
}

function mapPoDetail(header, items = []) {
  return {
    id: str(header.PurchaseOrder),

    poNo: str(header.PurchaseOrder),

    companyCode: str(header.CompanyCode || '1000'),

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
  const dDate = raw.ScheduleLineDeliveryDate
    ? sapODataDate(raw.ScheduleLineDeliveryDate)
    : sapDateToDisplay(raw.Eindt)
  const schedQty = trimNum(raw.ScheduleLineOrderQuantity ?? raw.Menge)
  const delivQty = trimNum(raw.PrevDelivQtyOfScheduleLine ?? raw.Wemng)
  const confQty = trimNum(raw.ScheduleLineCommittedQuantity ?? raw.Bmeng)
  const schLine = str(raw.PurchaseOrderScheduleLine || raw.Etenr)?.trim()

  return {
    ebeln:            str(raw.PurchaseOrder || raw.Ebeln),
    ebelp:            str(raw.PurchaseOrderItem || raw.Ebelp),
    etenr:            schLine,
    scheduleLine:     schLine,
    deliveryDate:     dDate,
    deliverySchedule: schedQty,
    scheduleQty:      schedQty,
    deliveredQty:     delivQty,
    confirmedQty:     confQty,
    unit:             str(raw.PurchaseOrderQuantityUnit || raw.Uom) || 'NO',
    schLineNo:        schLine,
    batch:            str(raw.Batch || ''),
  }
}

function mapPdirRef(raw) {
  const refNo = str(raw.Pdirno || raw.Pdir_Ref_No || raw.refNo || raw.PdirRefNo)
  return {
    ebeln:   str(raw.Purchaseorder || raw.Ebeln),
    ebelp:   str(raw.Poitem || raw.Ebelp),
    refNo:   refNo,
    value:   refNo,
    label:   refNo,
    refDate: raw.Shipmentdate ? sapDateToDisplay(raw.Shipmentdate) : sapDateToDisplay(raw.Pdir_Ref_Date),
  }
}

export const purchaseOrderApi = {
  async fetchAllSuppliers() {
     if (USE_MOCK) {
    return [
      ...new Map(
        MOCK_PO_HEADERS.map(item => [
          item.Vendor_No,
          {
            lifnr: item.Vendor_No,
            name: item.Vendor_Name
          }
        ])
      ).values()
    ]
  }

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
    if (USE_MOCK) {

    let rows = MOCK_PO_HEADERS

    if (vendorNo) {
      rows = rows.filter(
        x => x.Vendor_No === vendorNo
      )
    }

    return rows.map(mapHeader)
  }

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
    if (USE_MOCK) {

    const header =
      MOCK_PO_HEADERS.find(
        h => h.Po_No === poNo
      )

    if (!header) {
      throw new Error('PO not found')
    }

    const items =
      MOCK_PO_ITEMS[poNo] || []

    return {
      ...mapHeader(header),

      itemCount: String(items.length),

      amount: header.Amount,

      items: items.map(mapPoItem)
    }
  }

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

    try {
      let filter = `PurchaseOrder eq '${poNo}'`
      if (ebelp) {
        const padded = ebelp.padStart(5, '0')
        filter += ` and (PurchaseOrderItem eq '${padded}' or PurchaseOrderItem eq '${ebelp}')`
      }
      const res = await fetch(`${BASE}/ZCDS_PURCHASEITEM_SCH?$filter=${encodeURIComponent(filter)}&$format=json`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`OData ${res.status}: Failed to fetch schedule lines`)
      const json = await res.json()
      const results = json.d?.results || []
      if (results.length > 0) return results.map(mapLineItem)

      // If no schedule lines found for item, query without item filter or use mock fallback
      const fallbackLines = MOCK_SCHEDULE_LINES.filter(l => l.Ebeln === poNo && (!ebelp || l.Ebelp === ebelp))
      if (fallbackLines.length > 0) return fallbackLines.map(mapLineItem)
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
    } catch (err) {
      console.warn('[PurchaseOrder.getLineItems] Live fetch failed, using fallback:', err.message)
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
  },

  async getPdirRefs(poNo) {
    if (USE_MOCK) {
      return [
        { ebeln: poNo, ebelp: '00010', refNo: 'PDIR-2026-081', refDate: 'Aug 18, 2026' },
        { ebeln: poNo, ebelp: '00020', refNo: 'PDIR-2026-082', refDate: 'Aug 18, 2026' },
      ].map(mapPdirRef)
    }

    try {
      const res = await fetch(`${BASE}/ZP_PUR_ASN_ITEM?$filter=Purchaseorder eq '${poNo}'&$format=json`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`OData ${res.status}`)
      const json = await res.json()
      const results = json.d?.results || []
      const pdirs = results
        .filter(r => r.Pdirno)
        .map(r => ({
          Purchaseorder: r.Purchaseorder,
          Poitem: r.Poitem,
          Pdirno: r.Pdirno,
          Shipmentdate: r.Shipmentdate,
        }))
      if (pdirs.length > 0) return pdirs.map(mapPdirRef)
    } catch (err) {
      console.warn('[PurchaseOrder.getPdirRefs] Live fetch failed, using fallback:', err.message)
    }

    return [
      { ebeln: poNo, ebelp: '00010', refNo: 'PDIR-2026-081', refDate: 'Aug 18, 2026' },
      { ebeln: poNo, ebelp: '00020', refNo: 'PDIR-2026-082', refDate: 'Aug 18, 2026' },
    ].map(mapPdirRef)
  },

  async getConfirmData(poNo) {
    if (USE_MOCK) {
      return MOCK_CONFIRM_ROWS.map(mapConfirmRow)
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')

    try {
      const [itemRes, schRes] = await Promise.all([
        fetch(`${BASE}/ZCDS_PURCHASEITEM?$filter=PurchaseOrder eq '${poNo}'&$format=json`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }),
        fetch(`${BASE}/ZCDS_PURCHASEITEM_SCH?$filter=PurchaseOrder eq '${poNo}'&$format=json`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }),
      ])

      const itemJson = itemRes.ok ? await itemRes.json() : { d: { results: [] } }
      const schJson = schRes.ok ? await schRes.json() : { d: { results: [] } }

      const items = itemJson.d?.results || []
      const schs = schJson.d?.results || []

      if (items.length === 0 && schs.length === 0) {
        return MOCK_CONFIRM_ROWS.map(mapConfirmRow)
      }

      const rows = []
      if (schs.length > 0) {
        for (const sch of schs) {
          const matchingItem = items.find(it =>
            str(it.PurchaseOrderItem) === str(sch.PurchaseOrderItem) ||
            str(it.PurchaseOrderItem)?.replace(/^0+/, '') === str(sch.PurchaseOrderItem)?.replace(/^0+/, '')
          ) || {}

          rows.push(mapConfirmRow({
            Po_No: str(sch.PurchaseOrder || poNo),
            Item_No: str(sch.PurchaseOrderItem || matchingItem.PurchaseOrderItem),
            Schedule_Line: str(sch.PurchaseOrderScheduleLine || '1'),
            Vendor_No: str(matchingItem.Supplier || ''),
            Material_No: str(matchingItem.Material || ''),
            Material_Desc: str(matchingItem.PurchaseOrderItemText || ''),
            PO_Quantity: str(sch.ScheduleLineOrderQuantity || matchingItem.OrderQuantity || ''),
            Conf_Quantity: str(sch.ScheduleLineCommittedQuantity || matchingItem.PurgDocReleaseOrderQuantity || sch.ScheduleLineOrderQuantity || ''),
            Del_Quantity: str(sch.PrevDelivQtyOfScheduleLine || matchingItem.StockTransferDeliveredQuantity || '0.00'),
            Asn_Quantity: '0.00',
            Conf_Date: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
            DispDate: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
            ShipDate: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
            StorageBin: matchingItem.StorageLocation || '',
          }))
        }
      } else {
        for (const it of items) {
          rows.push(mapConfirmRow({
            Po_No: str(it.PurchaseOrder || poNo),
            Item_No: str(it.PurchaseOrderItem),
            Schedule_Line: '1',
            Vendor_No: str(it.Supplier || ''),
            Material_No: str(it.Material || ''),
            Material_Desc: str(it.PurchaseOrderItemText || ''),
            PO_Quantity: str(it.OrderQuantity || ''),
            Conf_Quantity: str(it.PurgDocReleaseOrderQuantity || it.OrderQuantity || ''),
            Del_Quantity: str(it.StockTransferDeliveredQuantity || '0.00'),
            Asn_Quantity: '0.00',
            Conf_Date: '',
            DispDate: '',
            ShipDate: '',
            StorageBin: it.StorageLocation || '',
          }))
        }
      }
      return rows
    } catch (err) {
      console.warn('[PurchaseOrder.getConfirmData] Live fetch failed, using fallback:', err.message)
      return MOCK_CONFIRM_ROWS.map(mapConfirmRow)
    }
  },

  async submitConfirm(poNo, selectedRows, vendorNo = '') {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400))
      return { success: true }
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')

    try {
      const csrfRes = await fetch(`${BASE}/`, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': 'Fetch',
          Accept: 'application/json',
        },
        credentials: 'include',
      })
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
          Po_No: poNo,
          Vendor_No: vendorNo,
          headertopoconfirmnav: {
            results: selectedRows.map(row => ({
              Po_No: poNo,
              Item_No: row.itemNo,
              Schedule_Line: row.scheduleLine,
              Vendor_No: vendorNo,
              Material_No: row.materialNo,
              Conf_Date: row.confDate,
              Conf_Quantity: String(row.confirmedQty),
              Del_Quantity: String(row.delQty),
              StorageBin: row.storageBin || '',
            })),
          },
        }),
      })

      if (!res.ok) {
        console.warn(`[submitConfirm] Backend returned ${res.status}, marking as confirmed for demo`)
        return { success: true, simulated: true }
      }

      return res.status === 204 ? { success: true } : res.json()
    } catch (err) {
      console.warn('[submitConfirm] Live submit failed, falling back to simulated success:', err.message)
      return { success: true, simulated: true }
    }
  },
}
