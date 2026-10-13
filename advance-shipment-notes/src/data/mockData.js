// ─────────────────────────────────────────────
// MOCK ASN LIST
// ─────────────────────────────────────────────
export const mockAsnList = [
  {
    id: 'ASN10001',
    amount: 125000.50,
    currency: 'INR',
    baseDocument: 'PO4500012345',
    plant: '1001',
    plantName: 'Neemrana Plant',
    date: '12.10.2025',
    status: 'Confirmed',
    statusColor: 'green',
    vendor: 'Kunstocom (India) Ltd',
  },
  {
    id: 'ASN10002',
    amount: 87500.00,
    currency: 'INR',
    baseDocument: 'PO4500012346',
    plant: '1002',
    plantName: 'Sri City Plant',
    date: '11.10.2025',
    status: 'Confirmed',
    statusColor: 'green',
    vendor: 'ABC Components Pvt Ltd',
  },
  {
    id: 'ASN10003',
    amount: 45230.75,
    currency: 'INR',
    baseDocument: 'PO4500012347',
    plant: '1001',
    plantName: 'Neemrana Plant',
    date: '10.10.2025',
    status: 'Cancelled',
    statusColor: 'red',
    vendor: 'Kunstocom (India) Ltd',
  },
  {
    id: 'ASN10004',
    amount: 210000.00,
    currency: 'INR',
    baseDocument: 'PO4500012348',
    plant: '1003',
    plantName: 'Rajasthan Plant',
    date: '09.10.2025',
    status: 'Confirmed',
    statusColor: 'green',
    vendor: 'XYZ Industries',
  },
]

// ─────────────────────────────────────────────
// MOCK ASN DETAIL
// ─────────────────────────────────────────────
export const mockAsnDetails = {
  ASN10001: {
    id: 'ASN10001',
    asnNum: '10001',
    fisYear: '2025',
    plant: '1001',
    plantName: 'Neemrana Plant',
    date: '12.10.2025',
    status: 'Confirmed',
    statusColor: 'green',
    generalData: {
      supplierInvoice: 'INV-2025-0891',
      invoiceAmount: 125000.50,
      baseDocument: 'PO4500012345',
      invoiceDate: '11.10.2025',
    },
    items: [
      {
        itemNo: '10',
        deliveryDate: '15.10.2025',
        material: 'Compressor Unit A12',
        materialCode: 'MAT-100234',
        quantity: 50,
        unit: 'EA',
        amount: 75000.00,
        hsnSac: '8414',
        igst: 13500.00,
        cgst: 0,
        sgstUtgst: 0,
      },
      {
        itemNo: '20',
        deliveryDate: '15.10.2025',
        material: 'Cooling Coil B7',
        materialCode: 'MAT-100567',
        quantity: 100,
        unit: 'EA',
        amount: 50000.50,
        hsnSac: '8415',
        igst: 9000.09,
        cgst: 0,
        sgstUtgst: 0,
      },
    ],
    taxSummary: {
      taxableValue: 125000.50,
      igst: 22500.09,
      cgst: 0,
      sgstUtgst: 0,
      unPlannedCost: 0,
      totalAmount: 147500.59,
    },
    shipment: {
      trackingNo: 'TRK99887766',
      transportMode: 'Road',
      driverName: 'Ramesh Kumar',
      vehicleRegNo: 'RJ14AB1234',
      contactNumber: '9876543210',
      creationDate: '12.10.2025',
      transporterName: 'SafeRoad Logistics',
      creationTime: '14:35:00',
    },
    attachments: [
      { name: 'Invoice_INV-2025-0891.pdf', type: 'Invoice' },
      { name: 'Eway_Bill_998877.pdf', type: 'E-Way Bill' },
    ],
  },
}

// Default detail for other ASNs (simple fallback)
export const getMockAsnDetail = (id) => {
  if (mockAsnDetails[id]) return mockAsnDetails[id]

  // fallback for other IDs
  return {
    id,
    asnNum: id.replace('ASN', ''),
    fisYear: '2025',
    plant: '1001',
    plantName: 'Neemrana Plant',
    date: '12.10.2025',
    status: 'Confirmed',
    statusColor: 'green',
    generalData: {
      supplierInvoice: 'INV-DEMO-001',
      invoiceAmount: 50000,
      baseDocument: 'PO4500099999',
      invoiceDate: '10.10.2025',
    },
    items: [
      {
        itemNo: '10',
        deliveryDate: '15.10.2025',
        material: 'Demo Material',
        materialCode: 'MAT-DEMO',
        quantity: 10,
        unit: 'EA',
        amount: 50000,
        hsnSac: '8414',
        igst: 9000,
        cgst: 0,
        sgstUtgst: 0,
      },
    ],
    taxSummary: {
      taxableValue: 50000,
      igst: 9000,
      cgst: 0,
      sgstUtgst: 0,
      unPlannedCost: 0,
      totalAmount: 59000,
    },
    shipment: {
      trackingNo: 'TRK-DEMO-001',
      transportMode: 'Road',
      driverName: 'Demo Driver',
      vehicleRegNo: 'RJ00XX0000',
      contactNumber: '9999999999',
      creationDate: '12.10.2025',
      transporterName: 'Demo Transport',
      creationTime: '10:00:00',
    },
    attachments: [],
  }
}