import { MOCK_TRACKINGS } from '../data/mockData.js'
import { formatAsnForSap, getSapTimestamp } from './CreateMovement.js'

const SRV = '/sap/opu/odata/sap/ZSB_TRACKING'
const ASN_ODATA_SRV = '/sap/opu/odata/sap/ZSB_PURCAHSE'
const HTTP_SRV = '/sap/bc/http/sap/ZHTTP_TRACKING'
const HTTP_SHIPMENT_SRV = '/sap/bc/http/sap/ZHTTP_SHIPMENT?sap-client=080'

export const authConfig = { loginId: '', loginType: '' }

const getHeaders = () => ({
  Accept: 'application/json',
  Loginid: authConfig.loginId,
  Logintype: authConfig.loginType,
})

export const toSapDate = (v) => {
  if (!v) return ''
  const s = String(v).trim()
  if (/^\d{8}$/.test(s)) return s
  const dateMatch = s.match(/\/Date\((\d+)\)\//)
  if (dateMatch) {
    const d = new Date(parseInt(dateMatch[1], 10))
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}${m}${day}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10).replace(/-/g, '')
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  return s.replace(/-/g, '').slice(0, 8)
}

export const fromSapDate = (sapDate) => {
  if (!sapDate || sapDate === '00000000') return ''
  if (typeof sapDate === 'string' && sapDate.includes('/Date(')) {
    const ms = parseInt(sapDate.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(ms)) {
      const dt = new Date(ms)
      return dt.toISOString().slice(0, 10)
    }
  }
  const clean = String(sapDate).replace(/-/g, '')
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  return sapDate
}

export const fromSapDateDisplay = (sapDate) => {
  if (!sapDate || sapDate === '00000000') return ''
  if (typeof sapDate === 'string' && sapDate.includes('/Date(')) {
    const ms = parseInt(sapDate.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(ms)) {
      const dt = new Date(ms)
      return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }
  }
  const clean = String(sapDate).replace(/-/g, '')
  if (clean.length === 8) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const y = clean.slice(0, 4)
    const m = parseInt(clean.slice(4, 6), 10) - 1
    const d = parseInt(clean.slice(6, 8), 10)
    return `${months[m]} ${String(d).padStart(2, '0')}, ${y}`
  }
  return sapDate
}

export const getTrackTimestamp = (t) => {
  if (!t) return 0
  const raw = t.rawDate || t.date || t.ewayBillDate || t.CreatedAt || t.CreatedDate || t.EwayBillDate || ''
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    if (raw.includes('/Date(')) {
      const ms = parseInt(raw.replace(/[^0-9]/g, ''), 10)
      if (!isNaN(ms)) return ms
    }
    const clean = raw.replace(/-/g, '').trim()
    if (clean.length === 8 && /^\d{8}$/.test(clean)) {
      const y = parseInt(clean.slice(0, 4), 10)
      const m = parseInt(clean.slice(4, 6), 10) - 1
      const d = parseInt(clean.slice(6, 8), 10)
      return new Date(y, m, d).getTime()
    }
    const parsed = new Date(raw).getTime()
    if (!isNaN(parsed)) return parsed
  }
  return 0
}

export const parseSapTrackNum = (id) => {
  const clean = String(id || '').split('/')[0].trim()
  if (/^0+\d+$/.test(clean)) {
    return parseInt(clean, 10)
  }
  const num = clean.replace(/\D/g, '')
  return num ? parseInt(num, 10) : 0
}

export const compareTrackings = (a, b, sortBy = 'latest') => {
  const timeA = getTrackTimestamp(a)
  const timeB = getTrackTimestamp(b)

  // Compare dates (day resolution)
  const dayA = Math.floor(timeA / 86400000)
  const dayB = Math.floor(timeB / 86400000)

  if (dayA !== dayB && timeA > 0 && timeB > 0) {
    return sortBy === 'oldest' ? dayA - dayB : dayB - dayA
  }

  // Same date or date not available: compare tracking numbers
  const idA = String(a.id || a.trackingNo || '').split('/')[0].trim()
  const idB = String(b.id || b.trackingNo || '').split('/')[0].trim()

  const isSapA = /^0+\d+$/.test(idA)
  const isSapB = /^0+\d+$/.test(idB)

  // Real sequential SAP tracking numbers (e.g. 0000000033) take precedence over legacy arbitrary numbers
  if (isSapA && !isSapB) return sortBy === 'oldest' ? 1 : -1
  if (!isSapA && isSapB) return sortBy === 'oldest' ? -1 : 1

  const numA = parseSapTrackNum(idA)
  const numB = parseSapTrackNum(idB)

  return sortBy === 'oldest' ? numA - numB : numB - numA
}

const resolveStatusColor = (statusText) => {
  const t = String(statusText || '').toLowerCase()
  if (t.includes('yet to ship') || t.includes('created')) return 'red'
  if (t.includes('in transit') || t.includes('shipped')) return 'blue'
  if (t.includes('received') || t.includes('gate') || t.includes('completed')) return 'green'
  return 'blue'
}

const buildTimelineFromHead = (head) => {
  const status = String(head.Status || '').toLowerCase()
  const createdDate = head.CreatedAt || head.CreatedDate || ''
  
  const isShipped = status.includes('transit') || status.includes('shipped') || status.includes('gate') || status.includes('received') || status.includes('completed')
  const isGateReporting = status.includes('reporting') || status.includes('gate entry') || status.includes('received') || status.includes('completed')
  const isGateEntry = status.includes('gate entry') || status.includes('gate in') || status.includes('received') || status.includes('completed')
  const isGoodsReceived = status.includes('received') || status.includes('completed')
  const isCompleted = status.includes('completed')

  return [
    { key: 'created', label: 'Created', completed: true, timestamp: fromSapDateDisplay(createdDate) },
    { key: 'shipped', label: 'Shipped', completed: isShipped, timestamp: isShipped ? fromSapDateDisplay(head.EwayBillDate || createdDate) : null },
    { key: 'gate_reporting', label: 'Gate Reporting', completed: isGateReporting, timestamp: null },
    { key: 'gate_entry', label: 'Gate Entry (IN)', completed: isGateEntry, timestamp: null },
    { key: 'goods_received', label: 'Goods Received', completed: isGoodsReceived, timestamp: null },
    { key: 'completed', label: 'Completed', completed: isCompleted, timestamp: null },
  ]
}

const mapHeadItem = (d) => {
  const rawId = String(d.TrackingId || '').trim()
  const trackId = rawId ? `${rawId}/2026` : ''
  const status = d.Status || 'In Transit'
  const statusColor = resolveStatusColor(status)

  return {
    id: trackId,
    trackingNo: rawId,
    year: '2026',
    companyCode: d.CompanyCode || '',
    companyCodeDesc: d.CompanyCode || '',
    supplier: d.Supplier || '',
    supplierName: d.SupplierName || '',
    supplierLocation: d.SupplierLocation || '',
    transportMode: d.TransportMode || 'By Road',
    transportationMode: d.TransportMode || 'By Road',
    date: fromSapDateDisplay(d.CreatedAt || d.EwayBillDate) || '',
    rawDate: d.CreatedAt || d.CreatedDate || d.EwayBillDate || '',
    plant: d.Plant || '',
    plantName: d.PlantName || '',
    status: status,
    statusColor: statusColor,
    transporter: d.TransporterName || '',
    driverName: d.DriverName || '',
    contact: d.ContactNumber || '',
    vehicleNo: d.VehicleRegNo || '',
    vehicleRegNo: d.VehicleRegNo || '',
    estimatedArrival: fromSapDateDisplay(d.EwayBillDate) || '',
    etaDate: fromSapDateDisplay(d.EwayBillDate) || '',
    ewayBillNo: d.EwayBillNo || '',
    ewayBillDate: fromSapDateDisplay(d.EwayBillDate) || '',
    pollutionCertificateApplicable: d.PollutionCertFlag ? 'Yes' : 'No',
    safetyEquipments: d.SafetyEquipmentFlag ? 'Yes' : 'No',
    safetyGuardForMaterial: d.SafetyGuardFlag ? 'Yes' : 'No',
    totalAsnAmount: parseFloat(d.TotalAsnAmount || '0.00'),
    ibdNumber: d.IBDnumber || d.IbdNumber || d.IBDNumber || d.ibdNumber || '',
    timeline: buildTimelineFromHead(d),
    asns: [],
  }
}

async function odata(path) {
  const res = await fetch(`${SRV}${path}`, {
    headers: {
      Accept: 'application/json',
      Loginid: authConfig.loginId,
      Logintype: authConfig.loginType,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OData GET ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${SRV}/`, {
      headers: {
        'X-CSRF-Token': 'Fetch',
        Loginid: authConfig.loginId,
        Logintype: authConfig.loginType,
      },
      credentials: 'include',
    })
    return res.headers.get('x-csrf-token') || ''
  } catch {
    return ''
  }
}

export const goodsMovementApi = {
  async listTrackings({ search = '' } = {}) {
    try {
      const filters = []
      if (search.trim()) {
        const cleanSearch = search.trim().slice(0, 10)
        filters.push(`substringof('${cleanSearch}',TrackingId)`)
      }
      const qs = filters.length ? `?$filter=${filters.map(encodeURIComponent).join('%20and%20')}` : ''
      const data = await odata(`/ZP_TRACKING_HEAD${qs}`)
      
      if (data && data.d) {
        const list = (data.d.results || []).map(mapHeadItem)
        // Always sort latest created tracking numbers on top by default (date first, then SAP sequence number)
        list.sort((a, b) => compareTrackings(a, b, 'latest'))

        // If live SAP returned a response (even if empty []), NEVER fall back in PROD
        if (import.meta.env.PROD || list.length > 0) {
          return list
        }
      }
    } catch (err) {
      console.warn('[GoodsMovement] Live ZP_TRACKING_HEAD call failed:', err.message)
      if (import.meta.env.PROD) {
        return []
      }
    }

    // Local DEV fallback only
    let mockList = MOCK_TRACKINGS.map(t => ({ ...t, companyCode: '', supplierName: '', supplierLocation: '' }))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      mockList = mockList.filter(
        m => m.trackingNo.toLowerCase().includes(q) ||
             m.id.toLowerCase().includes(q) ||
             m.plant.toLowerCase().includes(q) ||
             m.status.toLowerCase().includes(q)
      )
    }
    mockList.sort((a, b) => compareTrackings(a, b, 'latest'))
    return mockList
  },

  async getTracking(id) {
    const rawTrackNo = id.split('/')[0].trim()
    const trackingNo = rawTrackNo.slice(0, 10)

    try {
      const [headData, asnData] = await Promise.all([
        odata(`/ZP_TRACKING_HEAD?$filter=TrackingId%20eq%20'${encodeURIComponent(trackingNo)}'`),
        odata(`/ZP_TRACKING_ASN?$filter=TrackingId%20eq%20'${encodeURIComponent(trackingNo)}'`),
      ])

      const headResult = headData.d?.results?.[0]
      if (headResult) {
        const item = mapHeadItem(headResult)
        const ibd = headResult.IBDnumber || headResult.IbdNumber || headResult.IBDNumber || headResult.ibdNumber || ''
        item.ibdNumber = ibd
        if (asnData.d?.results && asnData.d.results.length > 0) {
          item.asns = asnData.d.results.map(a => ({
            asnId: a.AsnNo,
            asnYear: '2026',
            totalLineItems: 1,
            ibdNumber: a.IBDnumber || a.IbdNumber || ibd || '',
            plant: headResult.Plant || '',
            storageLocation: '',
            invoiceNumber: '',
            invoiceAmount: 0,
            invoiceDate: fromSapDateDisplay(headResult.EwayBillDate) || '',
          }))
        }
        return item
      }
    } catch (err) {
      console.warn('[GoodsMovement.getTracking] Live fetch failed:', err.message)
      if (import.meta.env.PROD) {
        return null
      }
    }

    const match = MOCK_TRACKINGS.find(t => t.id === id || t.trackingNo === rawTrackNo || t.trackingNo === trackingNo)
    return match ? { ...match, companyCode: '', supplierName: '', supplierLocation: '' } : {
      id,
      trackingNo,
      year: '2026',
      companyCode: '',
      companyCodeDesc: '',
      supplier: '',
      supplierName: '',
      supplierLocation: '',
      transportMode: 'By Road',
      transportationMode: 'By Road',
      date: '',
      plant: '',
      plantName: '',
      status: 'Yet to Ship',
      statusColor: 'red',
      transporter: '',
      driverName: '',
      contact: '',
      vehicleNo: '',
      vehicleRegNo: '',
      estimatedArrival: '',
      etaDate: '',
      ewayBillNo: '',
      ewayBillDate: '',
      pollutionCertificateApplicable: 'No',
      safetyEquipments: 'No',
      safetyGuardForMaterial: 'No',
      totalAsnAmount: 0,
      timeline: [],
      asns: [],
    }
  },

  async updateTracking(trackingId, payload) {
    const cleanTrackNo = trackingId.split('/')[0].trim().slice(0, 10)
    const updateBody = {
      type: 'U',
      Type: 'U',
      Invoice: payload.invoiceNumber || '',
      Companycode: payload.companyCode || '',
      Suppliercode: payload.supplierCode || authConfig.loginId || '',
      Asnnumber: payload.asnNo || '',
      Purchaseorder: payload.purchaseOrder || '',
      Plant: payload.plant || '',
      Invoicedate: toSapDate(payload.invoiceDate),
      Invoiceamount: String(payload.invoiceAmount || '0.00'),
      Invoicevalue: String(payload.invoiceValue || payload.invoiceAmount || '0.00'),
      VehicleRegNo: payload.vehicleNumber || '',
      TrackingId: cleanTrackNo,
      Isactive: 'X',
    }

    try {
      const res = await fetch(`${HTTP_SRV}?sap-client=080`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Loginid: authConfig.loginId,
          Logintype: authConfig.loginType,
        },
        credentials: 'include',
        body: JSON.stringify(updateBody),
      })
      if (res.ok) {
        return { success: true, message: 'Tracking updated successfully in SAP backend' }
      }
      const errText = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${errText}`)
    } catch (err) {
      console.warn('[GoodsMovement.updateTracking] Live POST failed:', err.message)
      if (import.meta.env.PROD) {
        throw err
      }
    }

    // In-memory update for local DEV only
    const target = MOCK_TRACKINGS.find(t => t.id === trackingId || t.trackingNo === cleanTrackNo)
    if (target) {
      if (payload.vehicleNumber) {
        target.vehicleRegNo = payload.vehicleNumber
        target.vehicleNo = payload.vehicleNumber
      }
      if (target.asns && target.asns.length > 0) {
        if (payload.asnNo) target.asns[0].asnId = payload.asnNo
        if (payload.invoiceNumber) target.asns[0].invoiceNumber = payload.invoiceNumber
      }
    }
    return { success: true, message: 'Tracking details updated locally (Demo Mode)' }
  },

  /**
   * Cancel tracking: updates ZP_TRACKING_HEAD with Status='Cancelled', CancelledBy, CancelledAt
   * and updates each associated ASN in ZP_TRACKING_ASN with Iscancelled='X'
   */
  async cancelTracking(trackingId, asns = []) {
    const rawTrackNo = trackingId.split('/')[0].trim().slice(0, 10)
    try {
      const token = await fetchCsrfToken()
      // 1. Update Status on ZP_TRACKING_HEAD
      await fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
        method: 'PATCH',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify({
          Status: 'Cancelled',
          CancelledBy: authConfig.loginId || '',
        }),
      }).catch(async () => {
        return fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
          method: 'MERGE',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          credentials: 'include',
          body: JSON.stringify({
            Status: 'Cancelled',
            CancelledBy: authConfig.loginId || '',
          }),
        })
      })

      // 2. Update each linked ASN with Iscancelled = 'X'
      for (const asn of asns) {
        const rawAsnId = asn.asnId || asn.AsnNo || asn.asn_no || asn
        const cleanAsn = formatAsnForSap(rawAsnId)
        await fetch(`${SRV}/ZP_TRACKING_ASN(TrackingId='${encodeURIComponent(rawTrackNo)}',AsnNo='${encodeURIComponent(cleanAsn)}')`, {
          method: 'PATCH',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          credentials: 'include',
          body: JSON.stringify({
            Iscancelled: 'X',
          }),
        }).catch(async () => {
          return fetch(`${SRV}/ZP_TRACKING_ASN(TrackingId='${encodeURIComponent(rawTrackNo)}',AsnNo='${encodeURIComponent(cleanAsn)}')`, {
            method: 'MERGE',
            headers: {
              ...getHeaders(),
              'Content-Type': 'application/json',
              'X-CSRF-Token': token,
            },
            credentials: 'include',
            body: JSON.stringify({
              Iscancelled: 'X',
            }),
          })
        }).catch((e) => console.warn('Cancel ASN warning:', e))
      }

      return { success: true, message: `Tracking ${rawTrackNo} cancelled successfully` }
    } catch (err) {
      console.warn('[GoodsMovement.cancelTracking] Live cancel failed:', err.message)
      if (import.meta.env.PROD) {
        throw err
      }
    }

    // Local dev mock update
    const target = MOCK_TRACKINGS.find(t => t.id === trackingId || t.trackingNo === rawTrackNo)
    if (target) {
      target.status = 'Cancelled'
      target.statusColor = 'red'
      target.asns?.forEach(a => { a.isCancelled = 'X' })
    }
    return { success: true, message: `Tracking ${rawTrackNo} cancelled locally (Demo Mode)` }
  },

  /**
   * Start Shipment:
   * 1. POST to /sap/bc/http/sap/ZHTTP_SHIPMENT with Type: 'S' and full goods movement payload
   * 2. Update ZP_TRACKING_HEAD in OData with Status: 'In Transit'
   */
  async startShipment(tracking) {
    const rawTrackNo = String(tracking.id || tracking.trackingNo || '').split('/')[0].trim().slice(0, 10)
    const timestamp = getSapTimestamp()

    const primaryAsn = tracking.asns?.[0] || {}
    const companyCode = tracking.companyCode || primaryAsn.companyCode || '1810'
    const supplierCode = String(tracking.supplierCode || primaryAsn.supplierCode || '').trim()
    const supplierName = tracking.supplierName || primaryAsn.supplierName || ''
    const supplierLocation = tracking.supplierLocation || primaryAsn.supplierLocation || ''

    const payload = {
      type: 'S',
      Type: 'S',
      head: {
        TrackingId: rawTrackNo,
        CompanyCode: companyCode,
        Supplier: supplierCode,
        SupplierName: supplierName,
        SupplierLocation: supplierLocation,
        TransportMode: tracking.transportMode || 'By Road',
        EwayBillNo: tracking.ewayBillNo || '',
        EwayBillDate: toSapDate(tracking.ewayBillDate),
        TransporterName: tracking.transporterName || '',
        DriverName: tracking.driverName || '',
        ContactNumber: tracking.contactNumber || '',
        VehicleRegNo: tracking.vehicleRegNo || '',
        PollutionCertFlag: !!tracking.pollutionCertificateApplicable,
        SafetyEquipmentFlag: !!tracking.safetyEquipments,
        SafetyGuardFlag: !!tracking.safetyGuardForMaterial,
        Status: 'In Transit',
      },
      asn: (tracking.asns || []).map((a) => ({
        Invoice: a.invoiceNumber || a.invoice || '',
        Companycode: a.companyCode || companyCode,
        Suppliercode: a.supplierCode || supplierCode,
        Asnnumber: a.asnId || a.AsnNo || '',
        Purchaseorder: a.purchaseOrder || '',
        Plant: a.plant || '',
        Invoicedate: toSapDate(a.invoiceDate),
        Invoiceamount: String(a.invoiceAmount || '0.00'),
        Invoicevalue: String(a.invoiceValue || a.invoiceAmount || '0.00'),
        Isactive: 'X',
      })),
    }

    console.log('[GoodsMovement.startShipment] Calling ZHTTP_SHIPMENT:', HTTP_SHIPMENT_SRV, payload)

    let res
    try {
      res = await fetch(HTTP_SHIPMENT_SRV, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Loginid: authConfig.loginId,
          Logintype: authConfig.loginType,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      }).catch(async () => {
        return fetch('/sap/bc/http/sap/ZHTTP_SHIPMENT', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Loginid: authConfig.loginId,
            Logintype: authConfig.loginType,
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      })
    } catch (httpErr) {
      if (import.meta.env.PROD) {
        throw new Error(`Shipment service unreachable: ${httpErr.message}`)
      }
    }

    const text = (await res?.text().catch(() => '')) || ''
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }
    const respData = data.d || data
    console.log('[GoodsMovement.startShipment] Response from SAP:', respData)

    // Check Type returned from SAP backend
    const respType = String(
      respData.Type ||
      respData.type ||
      respData.TYPE ||
      respData.Status ||
      respData.status ||
      ''
    ).trim().toUpperCase()

    const isSuccess = respType === 'S' || respType === 'SUCCESS'

    // If Type is NOT 'S', do NOT update status to 'In Transit'. Keep as 'Yet to Ship' and throw error.
    if (!isSuccess) {
      const errorMsg =
        respData.message ||
        respData.MESSAGE ||
        respData.error?.message?.value ||
        `Backend rejected start shipment (Type: ${respType || 'Error'})`
      throw new Error(errorMsg)
    }

    // Extract generated Inbound Delivery (IBD) number from SAP HTTP response
    const generatedIbd = String(
      respData.inbounddelivery ||
      respData.InboundDelivery ||
      respData.INBOUNDDELIVERY ||
      respData.inbounddeliveries?.[0] ||
      respData.InboundDeliveries?.[0] ||
      respData.ibdnumber ||
      respData.IBDnumber ||
      respData.IBDNumber ||
      ''
    ).trim()

    console.log('[GoodsMovement.startShipment] Extracted IBD Number:', generatedIbd)

    // 2. ONLY when Type is 'S': Persist Status and IBDnumber update to OData ZP_TRACKING_HEAD
    try {
      const token = await fetchCsrfToken()
      const headUpdatePayload = {
        TrackingId: rawTrackNo,
        Status: 'In Transit',
      }
      if (generatedIbd) {
        headUpdatePayload.IBDnumber = generatedIbd
      }

      await fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
        method: 'PATCH',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify(headUpdatePayload),
      }).catch(async () => {
        return fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
          method: 'MERGE',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          credentials: 'include',
          body: JSON.stringify(headUpdatePayload),
        })
      }).catch(async () => {
        return fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
          method: 'PUT',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          credentials: 'include',
          body: JSON.stringify(headUpdatePayload),
        })
      })

      // Dual-update ZHTTP_TRACKING with Type 'U' if backend listens on HTTP service for IBD
      if (generatedIbd) {
        fetch(`${HTTP_SRV}?sap-client=080`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Loginid: authConfig.loginId,
            Logintype: authConfig.loginType,
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'U',
            Type: 'U',
            TrackingId: rawTrackNo,
            IBDnumber: generatedIbd,
            InboundDelivery: generatedIbd,
            Status: 'In Transit',
          }),
        }).catch((e) => console.warn('ZHTTP_TRACKING Type U update notice:', e))
      }
    } catch (odataErr) {
      console.warn('[GoodsMovement.startShipment] OData update warning:', odataErr.message)
    }

    // Local dev mock update
    const target = MOCK_TRACKINGS.find(t => t.id === tracking.id || t.trackingNo === rawTrackNo)
    if (target) {
      target.status = 'In Transit'
      target.statusColor = 'orange'
      if (generatedIbd) {
        target.ibdNumber = generatedIbd
        target.asns?.forEach(a => { a.ibdNumber = generatedIbd })
      }
    }

    return {
      success: true,
      trackingNo: rawTrackNo,
      type: respType,
      inboundDelivery: generatedIbd,
      message: respData.message || (generatedIbd
        ? `Inbound delivery ${generatedIbd} created successfully for Tracking ${rawTrackNo}`
        : `Shipment for Tracking ${rawTrackNo} started successfully`),
    }
  },

  /**
   * Value help for ASN: fetch active ASNs from ZCDS_ACTIVE_ASN
   */
  async searchAsns({ search = '' } = {}) {
    const endpoints = [
      `${SRV}/ZCDS_ACTIVE_ASN?$format=json&$top=100`,
      `${ASN_ODATA_SRV}/ZCDS_ACTIVE_ASN?$format=json&$top=100`,
      `${ASN_ODATA_SRV}/ZP_PUR_ASN_HEAD?$format=json&$top=100`,
    ]

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            Loginid: authConfig.loginId,
            Logintype: authConfig.loginType,
          },
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          const rawResults = data.d?.results || []
          if (rawResults.length > 0) {
            let results = rawResults.map(r => ({
              asnId: r.Asnnumber || r.AsnNo || r.Asn_No || r.Asnnum || '',
              trackingNo: '',
              invoiceNumber: r.Invoice || r.InvoiceNo || r.Invoice_Num || '',
              vehicleNumber: '',
              plant: r.Plant || '',
              purchaseOrder: r.Purchaseorder || r.PurchaseOrder || '',
            }))
            if (search.trim()) {
              const q = search.trim().toLowerCase()
              results = results.filter(a =>
                (a.asnId || '').toLowerCase().includes(q) ||
                (a.invoiceNumber || '').toLowerCase().includes(q) ||
                (a.purchaseOrder || '').toLowerCase().includes(q)
              )
            }
            if (results.length > 0) return results
          }
        }
      } catch (err) {
        console.warn(`[GoodsMovement.searchAsns] Fetch failed for ${url}:`, err.message)
      }
    }

    if (import.meta.env.PROD) {
      return []
    }

    const mockAsnList = [
      { asnId: '2600000243', invoiceNumber: 'YYYYY2026', vehicleNumber: 'xfgb' },
      { asnId: '2600000240', invoiceNumber: 'INV-2026-88', vehicleNumber: 'HR-26-BQ-7744' },
      { asnId: '2600000238', invoiceNumber: 'INV-2026-75', vehicleNumber: 'AP-03-TC-8821' },
      { asnId: '2600000235', invoiceNumber: 'INV-2026-70', vehicleNumber: 'RJ-32-GA-1122' },
      { asnId: '2600000220', invoiceNumber: 'INV-2026-50', vehicleNumber: 'DL-01-AB-9988' },
    ]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return mockAsnList.filter(a => a.asnId.toLowerCase().includes(q))
    }
    return mockAsnList
  },
}

export default goodsMovementApi
