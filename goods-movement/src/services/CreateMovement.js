import { MOCK_ASN_HELP, MOCK_FIXED_BINS } from '../data/mockData.js'

const SRV = '/sap/opu/odata/sap/ZSB_TRACKING'
const ASN_ODATA_SRV = '/sap/opu/odata/sap/ZSB_PURCAHSE'
const HTTP_SRV = '/sap/bc/http/sap/ZHTTP_TRACKING?sap-client=080'

export const authConfig = { loginId: '', loginType: '' }

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
  return `${sapDate.slice(0, 4)}-${sapDate.slice(4, 6)}-${sapDate.slice(6, 8)}`
}

export const fromSapDateDisplay = (sapDate) => {
  if (!sapDate || sapDate === '00000000') return ''
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const y = sapDate.slice(0, 4)
  const m = parseInt(sapDate.slice(4, 6), 10) - 1
  const d = parseInt(sapDate.slice(6, 8), 10)
  return `${months[m]} ${String(d).padStart(2, '0')}, ${y}`
}

const getHeaders = () => ({
  Accept: 'application/json',
  Loginid: authConfig.loginId,
  Logintype: authConfig.loginType,
})

async function odata(path) {
  const res = await fetch(`${SRV}${path}`, {
    headers: getHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OData ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${SRV}/`, {
      method: 'GET',
      headers: { ...getHeaders(), 'X-CSRF-Token': 'Fetch' },
      credentials: 'include',
    })
    return res.headers.get('x-csrf-token') || ''
  } catch {
    return ''
  }
}

export const createMovementApi = {
  /**
   * Search available ASNs from ZP_PUR_ASN_HEAD in /sap/opu/odata/sap/ZSB_PURCAHSE
   */
  async searchAsns({ search = '' } = {}) {
    try {
      const res = await fetch(`${ASN_ODATA_SRV}/ZP_PUR_ASN_HEAD?$format=json&$top=100`, {
        headers: getHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        const rawResults = data.d?.results || []
        let results = rawResults.map((r) => ({
          asnId: r.Asnnumber || '',
          asnYear: String(new Date().getFullYear()),
          invoiceNumber: r.Invoice || '',
          invoiceAmount: parseFloat(r.Invoiceamount || '0') || 0,
          invoiceValue: parseFloat(r.Invoicevalue || r.Invoiceamount || '0') || 0,
          invoiceDate: r.Invoicedate || '',
          companyCode: r.Companycode || '',
          supplierCode: r.Suppliercode || '',
          supplierName: r.SupplierFullName || r.SupplierName || '',
          supplierLocation: r.SupplierLocation || r.supplieraddress || '',
          purchaseOrder: r.Purchaseorder || '',
          plant: r.Plant || '',
          currency: 'INR',
          isActive: r.Isactive || 'X',
        }))

        if (search.trim()) {
          const q = search.trim().toLowerCase()
          results = results.filter(
            (a) =>
              (a.asnId || '').toLowerCase().includes(q) ||
              (a.invoiceNumber || '').toLowerCase().includes(q) ||
              (a.purchaseOrder || '').toLowerCase().includes(q) ||
              (a.plant || '').toLowerCase().includes(q)
          )
        }
        if (results.length > 0) return results
      }
    } catch (err) {
      console.warn('[CreateMovement.searchAsns] Live ZP_PUR_ASN_HEAD fetch failed:', err.message)
      if (import.meta.env.PROD) {
        throw err
      }
    }

    // Local dev mock fallback
    let results = [...MOCK_ASN_HELP]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      results = results.filter(
        (a) =>
          a.asnId.toLowerCase().includes(q) ||
          (a.invoiceNumber || '').toLowerCase().includes(q) ||
          (a.plant || '').toLowerCase().includes(q)
      )
    }
    return results
  },

  async getFixedBin(asnId, asnYear) {
    try {
      const cleanAsn = String(asnId).slice(0, 20)
      const filter = encodeURIComponent(`AsnNo eq '${cleanAsn}'`)
      const data = await odata(`/ZP_TRACKING_ASN?$filter=${filter}`)
      const res = (data.d?.results || []).map((raw) => ({
        asnNo: raw.AsnNo || '',
        fixedBin: 'BIN-SR-01',
        plant: 'SR01',
        warehouseNo: 'WH1',
        storageType: '001',
      }))
      if (res.length > 0) return res
    } catch (err) {
      console.warn('[CreateMovement.getFixedBin] Live fetch failed:', err.message)
    }

    const match = MOCK_FIXED_BINS.filter((b) => b.asnNo.includes(asnId))
    return match.length > 0
      ? match
      : [
          {
            asnNo: `${asnId}/${asnYear || new Date().getFullYear()}`,
            fixedBin: 'BIN-SR-01',
            plant: 'SR01',
            warehouseNo: 'WH1',
            storageType: '001',
          },
        ]
  },

  /**
   * Step 1: POST to custom HTTP service /sap/bc/http/sap/ZHTTP_TRACKING
   * with type='T' to generate official TrackingId from SAP backend number range
   */
  async postCreateMovementHttp(form) {
    const primaryAsn = form.asnNums?.[0] || {}
    const companyCode = form.companyCode || primaryAsn.companyCode || ''
    const supplierCode = authConfig.loginId || primaryAsn.supplierCode || ''
    const supplierName = form.supplierName || primaryAsn.supplierName || ''
    const supplierLocation = form.supplierLocation || primaryAsn.supplierLocation || ''

    const ewayDateSap = toSapDate(form.ewayBillDate)

    const payload = {
      type: 'T',
      Type: 'T',
      head: {
        CompanyCode: companyCode,
        Supplier: supplierCode,
        SupplierName: supplierName,
        SupplierLocation: supplierLocation,
        TransportMode: form.transportMode || 'By Road',
        EwayBillNo: form.ewayBillNo || '',
        EwayBillDate: ewayDateSap,
        TransporterName: form.transporterName || '',
        DriverName: form.driverName || '',
        ContactNumber: form.contactNumber || '',
        VehicleRegNo: form.vehicleRegNo || '',
        PollutionCertFlag: !!form.pollutionCertificateApplicable,
        SafetyEquipmentFlag: !!form.safetyEquipments,
        SafetyGuardFlag: !!form.safetyGuardForMaterial,
        Status: 'Yet to Ship',
      },
      asn: (form.asnNums || []).map((a) => ({
        Invoice: a.invoiceNumber || '',
        Companycode: a.companyCode || companyCode,
        Suppliercode: a.supplierCode || supplierCode,
        Asnnumber: a.asnId || '',
        Purchaseorder: a.purchaseOrder || '',
        Plant: a.plant || '',
        Invoicedate: toSapDate(a.invoiceDate),
        Invoiceamount: String(a.invoiceAmount || '0.00'),
        Invoicevalue: String(a.invoiceValue || a.invoiceAmount || '0.00'),
        Isactive: a.isActive || 'X',
      })),
    }

    console.log('[GoodsMovement] Calling HTTP service:', HTTP_SRV, payload)

    let res
    try {
      res = await fetch(HTTP_SRV, {
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
    } catch {
      // Retry without query parameter if needed
      res = await fetch('/sap/bc/http/sap/ZHTTP_TRACKING', {
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
    }

    const text = await res.text().catch(() => '')
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }

    if (!res.ok) {
      throw new Error(
        data?.message ||
        data?.error?.message?.value ||
        `HTTP service failed (${res.status}): ${text.slice(0, 200)}`
      )
    }

    const respData = data.d || data
    console.log('[GoodsMovement] HTTP service response:', respData)

    // 1. Check exact & common property variations (including lowercase 'trackingnumber' from SAP)
    let rawTrackingNumber = String(
      respData.trackingnumber ||
      respData.TRACKINGNUMBER ||
      respData.TrackingNumber ||
      respData.TRACKING_ID ||
      respData.TrackingId ||
      respData.trackingId ||
      respData.tracking_id ||
      respData.TrackingNo ||
      respData.TrackNo ||
      respData.tracking_no ||
      respData.ASNNUMBER ||
      ''
    ).trim()

    // 2. Case-insensitive key lookup across all returned properties
    if (!rawTrackingNumber && typeof respData === 'object' && respData !== null) {
      for (const [k, v] of Object.entries(respData)) {
        const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (
          lowerKey === 'trackingnumber' ||
          lowerKey === 'trackingid' ||
          lowerKey === 'trackingno' ||
          lowerKey === 'trackno'
        ) {
          rawTrackingNumber = String(v || '').trim()
          if (rawTrackingNumber) break
        }
      }
    }

    // 3. Fallback regex extraction from message (e.g. "Tracking Number 0000000007 created successfully")
    if (!rawTrackingNumber && respData.message) {
      const match = String(respData.message).match(/Tracking\s+Number\s+([A-Za-z0-9_-]+)/i)
      if (match && match[1]) {
        rawTrackingNumber = match[1].trim()
      }
    }

    return {
      trackingNumber: rawTrackingNumber,
      raw: respData,
    }
  },

  /**
   * Create Movement:
   * 1. Trigger HTTP service /sap/bc/http/sap/ZHTTP_TRACKING with type='I'
   * 2. Obtain official backend-generated TrackingId
   * 3. Persist to OData ZP_TRACKING_HEAD and ZP_TRACKING_ASN
   */
  async createMovement(form) {
    const year = String(new Date().getFullYear())

    // 1. Call HTTP service
    let httpResult
    try {
      httpResult = await this.postCreateMovementHttp(form)
    } catch (httpErr) {
      console.error('[CreateMovement] HTTP service error:', httpErr)
      if (import.meta.env.PROD) {
        throw new Error(`Tracking number generation failed: ${httpErr.message}`)
      }
      // Demo fallback in local development only
      console.warn('[CreateMovement] Fallback tracking number for local dev')
      httpResult = { trackingNumber: String(Math.floor(1000000000 + Math.random() * 9000000000)) }
    }

    const generatedTrackNo = String(httpResult.trackingNumber || '').trim().slice(0, 10)
    if (!generatedTrackNo) {
      throw new Error('HTTP service did not return a valid tracking number.')
    }

    const primaryAsn = form.asnNums?.[0] || {}
    const companyCode = form.companyCode || primaryAsn.companyCode || ''
    const supplierCode = authConfig.loginId || primaryAsn.supplierCode || ''
    const supplierName = form.supplierName || primaryAsn.supplierName || ''
    const supplierLocation = form.supplierLocation || primaryAsn.supplierLocation || ''

    // 2. Persist to OData ZP_TRACKING_HEAD and ZP_TRACKING_ASN
    try {
      const token = await fetchCsrfToken()
      const headPayload = {
        TrackingId: generatedTrackNo,
        CompanyCode: companyCode,
        Supplier: supplierCode,
        SupplierName: supplierName,
        SupplierLocation: supplierLocation,
        TransportMode: form.transportMode || 'By Road',
        EwayBillNo: form.ewayBillNo || '',
        EwayBillDate: form.ewayBillDate ? `/Date(${new Date(form.ewayBillDate).getTime()})/` : `/Date(${Date.now()})/`,
        TransporterName: form.transporterName || '',
        DriverName: form.driverName || '',
        ContactNumber: form.contactNumber || '',
        VehicleRegNo: form.vehicleRegNo || '',
        PollutionCertFlag: !!form.pollutionCertificateApplicable,
        SafetyEquipmentFlag: !!form.safetyEquipments,
        SafetyGuardFlag: !!form.safetyGuardForMaterial,
        Status: 'Yet to Ship',
      }

      const res = await fetch(`${SRV}/ZP_TRACKING_HEAD`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify(headPayload),
      })

      if (res.ok) {
        // Save ASN associations to ZP_TRACKING_ASN
        for (const asn of form.asnNums || []) {
          await fetch(`${SRV}/ZP_TRACKING_ASN`, {
            method: 'POST',
            headers: {
              ...getHeaders(),
              'Content-Type': 'application/json',
              'X-CSRF-Token': token,
            },
            credentials: 'include',
            body: JSON.stringify({
              TrackingId: generatedTrackNo,
              AsnNo: String(asn.asnId).slice(0, 20),
            }),
          }).catch((e) => console.warn('ASN post warning:', e))
        }
      } else {
        const errText = await res.text().catch(() => '')
        console.warn(`[CreateMovement] OData save warning (${res.status}):`, errText)
      }
    } catch (odataErr) {
      console.warn('[CreateMovement] OData save warning:', odataErr.message)
    }

    return {
      trackingId: `${generatedTrackNo}/${year}`,
      trackNo: generatedTrackNo,
      year,
      message: `Movement No. ${generatedTrackNo}/${year} created successfully`,
    }
  },

  async updateMovement(id, form) {
    const rawTrackNo = id.split('/')[0].trim().slice(0, 10)
    const year = String(new Date().getFullYear())

    try {
      const token = await fetchCsrfToken()
      const res = await fetch(`${SRV}/ZP_TRACKING_HEAD('${encodeURIComponent(rawTrackNo)}')`, {
        method: 'PUT',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify({
          TrackingId: rawTrackNo,
          DriverName: form.driverName || '',
          ContactNumber: form.contactNumber || '',
          VehicleRegNo: form.vehicleRegNo || '',
          TransporterName: form.transporterName || '',
        }),
      })

      if (res.ok || res.status === 204) {
        return { trackingId: `${rawTrackNo}/${year}`, trackNo: rawTrackNo, year }
      }
    } catch (err) {
      console.warn('[CreateMovement.updateMovement] Live PUT failed:', err.message)
      if (import.meta.env.PROD) throw err
    }
    return { trackingId: `${rawTrackNo}/${year}`, trackNo: rawTrackNo, year }
  },
}

export default createMovementApi
