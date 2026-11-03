/**
 * Purchase Order API Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

// Value written to ZP_PO_CONFIRM.Status on confirm (max 10 chars).
// Check with your backend team what the expected value is.
const CONFIRM_STATUS = 'CONF'

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
  const strVal = String(s).trim()
  // Handle /Date(ms)/
  const m = /\/Date\((\d+)\)\//.exec(strVal)
  if (m) {
    const d = new Date(Number(m[1]))
    if (!isNaN(d)) {
      return d.toISOString().slice(0, 10)
    }
  }
  // Handle YYYYMMDD
  const clean = strVal.replace(/-/g, '')
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  // Handle human strings like "Oct 26, 2026"
  const parsed = new Date(strVal + ' 12:00:00')
  if (!isNaN(parsed)) {
    const y = parsed.getFullYear()
    const mo = String(parsed.getMonth() + 1).padStart(2, '0')
    const dy = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${mo}-${dy}`
  }
  return ''
}

function trimNum(s) {
  if (s === null || s === undefined || s === '') return '0.00'
  const n = parseFloat(String(s).trim())
  return isNaN(n) ? '0.00' : n.toFixed(2)
}

const str = (v) => String(v ?? '').trim()

// ZP_PO_CONFIRM.Purchaseorderitem is MaxLength 4 (e.g. '0010'), while the
// other CDS views use 5 characters ('00010').
const toItem4 = (v) => str(v).padStart(4, '0').slice(-4)

// ── Confirmation tracking (line level) ─────────────────────────
// ZP_PO_CONFIRM currently exposes only Purchaseorder, Purchaseorderitem, Vendor,
// Material and Status. For batch-wise / schedule-line-wise confirmation the backend
// must add a schedule line (or batch) field to that entity's key. Once it exists,
// put its property name here (e.g. 'Scheduleline'). While it is '' a confirmation
// applies to the whole PO item + material.
const CONFIRM_SCHEDULE_FIELD = ''

// '0001' -> '1', '' -> ''
const schNo = (v) => str(v).replace(/^0+/, '')

// One key per confirmed line: item (4 chars) | material | schedule line
const confirmKey = (item, material, sched = '') =>
  `${toItem4(item)}|${str(material)}|${schNo(sched)}`

// A line is confirmed if ZP_PO_CONFIRM has a row for that exact schedule line,
// or an item-level row (no schedule line stored) for that item + material.
export const isLineConfirmed = (map, item, material, sched = '') =>
  map.has(confirmKey(item, material, sched)) || map.has(confirmKey(item, material, ''))

// Returns Map<confirmKey, Status> for the rows already present in ZP_PO_CONFIRM for this PO.
// (odataGet is a function declaration below, so it is hoisted and safe to call here.)
export async function fetchConfirmedMap(poNo) {
  try {
    const data = await odataGet(
      `/ZP_PO_CONFIRM?$filter=${encodeURIComponent(`Purchaseorder eq '${poNo}'`)}&$format=json`
    )
    const map = new Map()
    for (const r of data?.results || []) {
      const sched = CONFIRM_SCHEDULE_FIELD ? r[CONFIRM_SCHEDULE_FIELD] : ''
      map.set(confirmKey(r.Purchaseorderitem, r.Material, sched), str(r.Status))
    }
    return map
  } catch (err) {
    console.warn('[PurchaseOrder] Could not load confirmations:', err.message)
    return new Map()
  }
}

// Dashboard status of one PO item, from how many of its schedule lines are confirmed.
function itemConfirmStatus(rawItem, schs, confirmedMap) {
  const item4 = toItem4(rawItem.PurchaseOrderItem)
  const lines = schs.filter(s => toItem4(s.PurchaseOrderItem) === item4)
  const scheds = lines.length ? lines.map(s => s.PurchaseOrderScheduleLine) : ['']
  const done = scheds.filter(sc =>
    isLineConfirmed(confirmedMap, rawItem.PurchaseOrderItem, rawItem.Material, sc)
  ).length
  if (done === 0) return 'Confirmation Required'
  return done === scheds.length ? 'Confirmed' : 'Partially Confirmed'
}

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

// Single default schedule line used when nothing is found for a PO item
function defaultScheduleLine(poNo, ebelp) {
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
    },
  ]
}

// Generic OData GET helper. Returns json.d (for collections: { results: [...] }).
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
    year: 'numeric',
  })
}

function mapHeader(raw) {
  const companyCode = str(raw.CompanyCode || '1000')
  const companyCodeName = str(raw.CompanyCodeName || raw.CompanyCode || '')
  const vendorNo = str(raw.Supplier || raw.Vendor || raw.Vendor_No)
  const vendorName = str(raw.SupplierFullName || raw.Vendor_Name || raw.Supplier || raw.Vendor)
  const vendorAddr = str(raw.supplieraddress || raw.SupplierAddress || '')
  const plantCode = str(raw.Plant || raw.SupplyingPlant || '')
  const plantDesc = str(raw.Plantname || raw.Plant_Desc || raw.SupplyingPlant || raw.SupplierName || '')

  return {
    id: str(raw.PurchaseOrder || raw.Purchaseorder || raw.Po_No),

    poNo: str(raw.PurchaseOrder || raw.Purchaseorder || raw.Po_No),

    companyCode,

    companyCodeName,

    plant: plantCode,

    plantName: plantDesc,

    date: raw.PurchaseOrderDate
      ? sapODataDate(raw.PurchaseOrderDate)
      : sapDateToDisplay(raw.Po_Date),

    type: str(raw.PurchaseOrderType || raw.Order_Type),

    vendor: vendorName,

    vendorNo,

    vendorAddress: vendorAddr,

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

    asnFlag: str(raw.Asn_Flag || ''),
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
      raw.Plantname ||
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
        : Number(raw.PurgDocReleaseOrderQuantity) > 0
        ? 'Partially Confirmed'
        : 'Confirmation Required'),

    deliveryDate:
      raw.Delivery_Date
        ? sapDateToDisplay(raw.Delivery_Date)
        : raw.GoodsReceiptLatestCreationDate
        ? sapDateToDisplay(raw.GoodsReceiptLatestCreationDate)
        : '',

    scheduleLines: [],
  }
}

function mapPoDetail(header, items = [], confirmedMap = new Map(), schs = []) {
  const mappedItems = items.map(raw => {
    const it = mapPoItem(raw)

    // Match schedule line delivery date from ZCDS_PURCHASEITEM_SCH
    const itemSchs = schs.filter(s =>
      toItem4(s.PurchaseOrderItem) === toItem4(raw.PurchaseOrderItem) ||
      str(s.PurchaseOrderItem) === str(raw.PurchaseOrderItem)
    )
    if (itemSchs.length > 0) {
      const dates = itemSchs
        .map(s => s.ScheduleLineDeliveryDate)
        .filter(Boolean)
      if (dates.length > 0) {
        it.deliveryDate = sapODataDate(dates[0])
        it.deliveryDateIso = sapDateToIso(dates[0])
      }
    }
    if (!it.deliveryDateIso && it.deliveryDate) {
      it.deliveryDateIso = sapDateToIso(it.deliveryDate)
    }

    // Confirmation state comes from ZP_PO_CONFIRM, not from SAP release quantities
    if (it.status !== 'Completed' && it.status !== 'Blocked') {
      it.status = itemConfirmStatus(raw, schs, confirmedMap)
      it.isConfirmed = it.status === 'Confirmed'
      if (it.isConfirmed) it.confirmQty = it.poQty
    }
    return it
  })

  const companyCode = str(header.CompanyCode || '1000')
  const companyCodeName = str(header.CompanyCodeName || header.CompanyCode || '')
  const vendorNo = str(header.Supplier)
  const vendorName = str(header.SupplierFullName || header.Supplier)
  const vendorAddr = str(header.supplieraddress || header.SupplierAddress || '')
  const firstItemPlant = items[0]?.Plant ? str(items[0].Plant) : ''
  const firstItemPlantDesc = items[0]?.plantDesc || items[0]?.Plantname || str(header.SupplyingPlant || '')

  return {
    id: str(header.PurchaseOrder),

    poNo: str(header.PurchaseOrder),

    companyCode,

    companyCodeName,

    vendorNo,

    vendor: vendorName,

    vendorAddress: vendorAddr,

    date: sapODataDate(header.PurchaseOrderDate),

    plant: firstItemPlant || str(header.SupplyingPlant || ''),

    plantDesc: firstItemPlantDesc || str(header.SupplyingPlant || ''),

    buyerName: str(header.CreatedByUser),

    purchaseOrg: str(header.PurchasingOrganization),

    purchaseGroup: str(header.PurchasingGroup),

    orderType: str(header.PurchaseOrderType),

    status: str(header.PurchaseOrderType),

    itemCount: String(mappedItems.length),

    currency: 'INR',

    amount: items
      .reduce((sum, item) => sum + Number(item.NetAmount || 0), 0)
      .toFixed(2),

    items: mappedItems,
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
    alreadyConfirmed: !!raw.alreadyConfirmed,
  }
}

function mapLineItem(raw) {
  const dDate = raw.ScheduleLineDeliveryDate
    ? sapODataDate(raw.ScheduleLineDeliveryDate)
    : sapDateToDisplay(raw.Eindt)
  const schedQty = trimNum(raw.ScheduleLineOrderQuantity ?? raw.Menge)
  const delivQty = trimNum(raw.PrevDelivQtyOfScheduleLine ?? raw.Wemng)
  const confQty = trimNum(raw.ScheduleLineCommittedQuantity ?? raw.Bmeng)
  const schLine = str(raw.PurchaseOrderScheduleLine || raw.Etenr)

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
              name: item.Vendor_Name,
            },
          ])
        ).values(),
      ]
    }

    const res = await fetch(`${BASE}/ZCDS_PURCHASE_HEADER?$format=json`, {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    })

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
            name: str(item.SupplierFullName || item.Supplier),
          },
        ])
      ).values(),
    ]
  },

  async listHeaders({ vendorNo = '' } = {}) {
    if (USE_MOCK) {
      let rows = MOCK_PO_HEADERS

      if (vendorNo) {
        rows = rows.filter(x => x.Vendor_No === vendorNo)
      }

      return rows.map(mapHeader)
    }

    let url = `${BASE}/ZCDS_PURCHASE_HEADER?$format=json`

    if (vendorNo) {
      url += `&$filter=${encodeURIComponent(`Supplier eq '${vendorNo}'`)}`
    }

    const [headerRes, itemRes] = await Promise.all([
      fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }),
      fetch(`${BASE}/ZCDS_PURCHASEITEM?$select=PurchaseOrder,Plant,Plantname&$format=json`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }).catch(() => null),
    ])

    if (!headerRes.ok) {
      throw new Error('Failed to load purchase orders')
    }

    const json = await headerRes.json()
    const headerResults = json.d?.results || []

    // Map plant information from item view if items returned
    const itemMap = new Map()
    if (itemRes && itemRes.ok) {
      try {
        const itemJson = await itemRes.json()
        for (const it of itemJson.d?.results || []) {
          const po = str(it.PurchaseOrder)
          if (!itemMap.has(po) && (it.Plant || it.Plantname)) {
            itemMap.set(po, {
              plant: str(it.Plant),
              plantName: str(it.Plantname || it.Plant),
            })
          }
        }
      } catch (e) {
        console.warn('Could not load plant details for PO list:', e)
      }
    }

    return headerResults.map(raw => {
      const h = mapHeader(raw)
      const itemInfo = itemMap.get(h.id) || itemMap.get(h.poNo)
      if (itemInfo) {
        if (!h.plant) h.plant = itemInfo.plant
        if (!h.plantName || h.plantName === h.plant) h.plantName = itemInfo.plantName
      }
      return h
    })
  },

  /**
   * ZP_PO_CONFIRM has a 4-part key (Purchaseorder, Purchaseorderitem, Vendor,
   * Material), so a single row cannot be read by key from just PO + vendor.
   * Use $filter instead.
   */
  async getHeader(poNo, vendorNo = '') {
    if (USE_MOCK) {
      const h = MOCK_PO_HEADERS.find(item => item.Po_No === poNo) || MOCK_PO_HEADERS[0]
      return mapHeader(h)
    }

    let filter = `Purchaseorder eq '${poNo}'`
    if (vendorNo) filter += ` and Vendor eq '${vendorNo}'`

    const data = await odataGet(
      `/ZP_PO_CONFIRM?$filter=${encodeURIComponent(filter)}&$format=json`
    )
    const row = data?.results?.[0]
    if (!row) throw new Error(`PO ${poNo} not found`)

    return mapHeader({
      Purchaseorder: row.Purchaseorder,
      Vendor: row.Vendor,
      Status: row.Status,
    })
  },

  async getPoDetail(poNo) {
    if (USE_MOCK) {
      const header = MOCK_PO_HEADERS.find(h => h.Po_No === poNo)

      if (!header) {
        throw new Error('PO not found')
      }

      const items = MOCK_PO_ITEMS[poNo] || []

      return {
        ...mapHeader(header),
        itemCount: String(items.length),
        amount: header.Amount,
        items: items.map(mapPoItem),
      }
    }

    const [headerRes, itemRes, schRes, confirmedMap] = await Promise.all([
      fetch(
        `${BASE}/ZCDS_PURCHASE_HEADER?$filter=${encodeURIComponent(`PurchaseOrder eq '${poNo}'`)}&$format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
        }
      ),

      fetch(
        `${BASE}/ZCDS_PURCHASEITEM?$filter=${encodeURIComponent(`PurchaseOrder eq '${poNo}'`)}&$format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
        }
      ),

      fetch(
        `${BASE}/ZCDS_PURCHASEITEM_SCH?$filter=${encodeURIComponent(`PurchaseOrder eq '${poNo}'`)}&$format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
        }
      ),

      fetchConfirmedMap(poNo),
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

    // Schedule lines are optional here: if the call fails, status falls back to item level
    const schJson = schRes.ok ? await schRes.json() : { d: { results: [] } }

    return mapPoDetail(header, itemJson.d?.results || [], confirmedMap, schJson.d?.results || [])
  },

  async getLineItems(poNo, ebelp) {
    const mockLines = () =>
      MOCK_SCHEDULE_LINES.filter(l => l.Ebeln === poNo && (!ebelp || l.Ebelp === ebelp))

    if (USE_MOCK) {
      const lines = mockLines()
      if (lines.length > 0) return lines.map(mapLineItem)
      return defaultScheduleLine(poNo, ebelp)
    }

    try {
      let filter = `PurchaseOrder eq '${poNo}'`
      if (ebelp) {
        const padded = ebelp.padStart(5, '0')
        filter += ` and (PurchaseOrderItem eq '${padded}' or PurchaseOrderItem eq '${ebelp}')`
      }
      const res = await fetch(
        `${BASE}/ZCDS_PURCHASEITEM_SCH?$filter=${encodeURIComponent(filter)}&$format=json`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      )
      if (!res.ok) throw new Error(`OData ${res.status}: Failed to fetch schedule lines`)
      const json = await res.json()
      const results = json.d?.results || []
      if (results.length > 0) return results.map(mapLineItem)

      // No schedule lines found for this item: use fallback
      const fallbackLines = mockLines()
      if (fallbackLines.length > 0) return fallbackLines.map(mapLineItem)
      return defaultScheduleLine(poNo, ebelp)
    } catch (err) {
      console.warn('[PurchaseOrder.getLineItems] Live fetch failed, using fallback:', err.message)
      const lines = mockLines()
      if (lines.length > 0) return lines.map(mapLineItem)
      return defaultScheduleLine(poNo, ebelp)
    }
  },

  async getPdirRefs(poNo) {
    const fallback = () =>
      [
        { ebeln: poNo, ebelp: '00010', refNo: 'PDIR-2026-081', refDate: 'Aug 18, 2026' },
        { ebeln: poNo, ebelp: '00020', refNo: 'PDIR-2026-082', refDate: 'Aug 18, 2026' },
      ].map(mapPdirRef)

    if (USE_MOCK) {
      return fallback()
    }

    try {
      const res = await fetch(
        `${BASE}/ZP_PUR_ASN_ITEM?$filter=${encodeURIComponent(`Purchaseorder eq '${poNo}'`)}&$format=json`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      )
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

    return fallback()
  },

  async getConfirmData(poNo) {
    if (USE_MOCK) {
      return MOCK_CONFIRM_ROWS.map(mapConfirmRow)
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')

    try {
      const poFilter = encodeURIComponent(`PurchaseOrder eq '${poNo}'`)
      const [itemRes, schRes, confirmedMap] = await Promise.all([
        fetch(`${BASE}/ZCDS_PURCHASEITEM?$filter=${poFilter}&$format=json`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }),
        fetch(`${BASE}/ZCDS_PURCHASEITEM_SCH?$filter=${poFilter}&$format=json`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }),
        fetchConfirmedMap(poNo),
      ])

      const itemJson = itemRes.ok ? await itemRes.json() : { d: { results: [] } }
      const schJson = schRes.ok ? await schRes.json() : { d: { results: [] } }

      const items = itemJson.d?.results || []
      const schs = schJson.d?.results || []

      // Nothing found for this PO: return an empty list, never fake rows
      if (items.length === 0 && schs.length === 0) {
        return []
      }

      const rows = []
      if (schs.length > 0) {
        for (const sch of schs) {
          const matchingItem =
            items.find(
              it =>
                str(it.PurchaseOrderItem) === str(sch.PurchaseOrderItem) ||
                str(it.PurchaseOrderItem).replace(/^0+/, '') ===
                  str(sch.PurchaseOrderItem).replace(/^0+/, '')
            ) || {}

          rows.push(
            mapConfirmRow({
              Po_No: str(sch.PurchaseOrder || poNo),
              Item_No: str(sch.PurchaseOrderItem || matchingItem.PurchaseOrderItem),
              Schedule_Line: str(sch.PurchaseOrderScheduleLine || '1'),
              Vendor_No: str(matchingItem.Supplier || ''),
              Material_No: str(matchingItem.Material || ''),
              Material_Desc: str(matchingItem.PurchaseOrderItemText || ''),
              PO_Quantity: str(sch.ScheduleLineOrderQuantity || matchingItem.OrderQuantity || ''),
              Conf_Quantity: str(
                sch.ScheduleLineCommittedQuantity ||
                  matchingItem.PurgDocReleaseOrderQuantity ||
                  sch.ScheduleLineOrderQuantity ||
                  ''
              ),
              Del_Quantity: str(
                sch.PrevDelivQtyOfScheduleLine ||
                  matchingItem.StockTransferDeliveredQuantity ||
                  '0.00'
              ),
              Asn_Quantity: '0.00',
              Conf_Date: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
              DispDate: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
              ShipDate: sch.ScheduleLineDeliveryDate ? sapODataDate(sch.ScheduleLineDeliveryDate) : '',
              StorageBin: matchingItem.StorageLocation || '',
              alreadyConfirmed: isLineConfirmed(
                confirmedMap,
                sch.PurchaseOrderItem || matchingItem.PurchaseOrderItem,
                matchingItem.Material,
                sch.PurchaseOrderScheduleLine
              ),
            })
          )
        }
      } else {
        for (const it of items) {
          rows.push(
            mapConfirmRow({
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
              alreadyConfirmed: isLineConfirmed(confirmedMap, it.PurchaseOrderItem, it.Material, ''),
            })
          )
        }
      }
      // Confirmed lines are not offered for confirmation again
      return rows.filter(r => !r.alreadyConfirmed)
    } catch (err) {
      // Do not fall back to mock rows on a live failure: surface the error to the UI
      console.error('[PurchaseOrder.getConfirmData] Live fetch failed:', err.message)
      throw err
    }
  },

  /**
   * Confirms the selected PO items.
   *
   * ZP_PO_CONFIRM exposes only: Purchaseorder, Purchaseorderitem (4 chars),
   * Vendor, Material and Status, and has no navigation property. So we send
   * one POST per selected item using exactly those property names.
   *
   * NOTE: quantity / date / storage bin cannot be sent with this entity.
   * They need extra fields in the CDS projection or a separate entity/action.
   * Errors are thrown instead of being reported as a simulated success.
   * A duplicate-key error (already confirmed in the backend) is skipped.
   */
  async submitConfirm(poNo, selectedRows, vendorNo = '') {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400))
      return { success: true }
    }

    if (!poNo || poNo === 'undefined') throw new Error('No PO number provided')
    if (!selectedRows || selectedRows.length === 0) throw new Error('No rows selected to confirm')

    // 1) Fetch CSRF token
    const csrfRes = await fetch(`${BASE}/`, {
      method: 'GET',
      headers: {
        'X-CSRF-Token': 'Fetch',
        Accept: 'application/json',
      },
      credentials: 'include',
    })
    if (!csrfRes.ok) {
      throw new Error(`Could not fetch CSRF token: ${csrfRes.status}`)
    }
    const token = csrfRes.headers.get('X-CSRF-Token') || ''

    // 2) One POST per unique item (no deep insert / nav property in metadata).
    //    The confirm screen has one row per schedule line, so dedupe by item + material.
    const results = []
    const seen = new Set()
    for (const row of selectedRows) {
      // Without a schedule-line field on ZP_PO_CONFIRM the key is item + vendor + material,
      // so several schedule lines of one item can only be posted once.
      const sched = CONFIRM_SCHEDULE_FIELD ? schNo(row.scheduleLine) : ''
      const dedupeKey = `${toItem4(row.itemNo)}|${str(row.materialNo)}|${sched}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const payload = {
        Purchaseorder: poNo,
        Purchaseorderitem: toItem4(row.itemNo),
        Vendor: str(vendorNo || row.vendorNo),
        Material: str(row.materialNo),
        Status: CONFIRM_STATUS,
      }
      // Adjust the padding/format to whatever the backend field expects
      if (CONFIRM_SCHEDULE_FIELD) payload[CONFIRM_SCHEDULE_FIELD] = sched

      const res = await fetch(`${BASE}/ZP_PO_CONFIRM`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let detail = '', code = ''
        try {
          const errJson = await res.json()
          code = errJson?.error?.code || ''
          detail = errJson?.error?.message?.value || JSON.stringify(errJson)
        } catch {
          detail = await res.text().catch(() => '')
        }
        // Already confirmed in backend: not a failure, just skip
        if (code === 'MC_CSP_USR_RUNTIME/006') {
          results.push({ success: true, skipped: true })
          continue
        }
        throw new Error(`Confirm failed for item ${payload.Purchaseorderitem} (${res.status}): ${detail}`)
      }

      results.push(res.status === 204 ? { success: true } : await res.json())
    }

    return { success: true, results }
  },
}