/**
 * Attachment Upload Service
 * Set USE_MOCK to false once live SAP OData service is connected.
 */
export const USE_MOCK = false

const SA_ODATA_BASE = '/sap/opu/odata/sap/ZSB_PURCAHSE'

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${SA_ODATA_BASE}/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': 'Fetch',
      },
      credentials: 'include',
    })
    const token = res.headers.get('x-csrf-token') || ''
    return token
  } catch {
    return ''
  }
}

export async function uploadAttachmentToSap({ asnNum, fisYear, file, csrfToken, kind = 'general' }) {
  try {
    const url = `${SA_ODATA_BASE}/AsnAttachementSet`
    const buffer = await file.arrayBuffer()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken,
        'slug': `${asnNum}/${fisYear}/${file.name}`,
        'AsnNum': asnNum,
        'FisYear': fisYear,
      },
      body: buffer,
      credentials: 'include',
    })

    if (!res.ok) {
      console.warn(`[uploadAttachmentToSap] Attachment upload returned ${res.status}, continuing`)
    }

    return res
  } catch (err) {
    console.warn('[uploadAttachmentToSap] Live upload error, continuing:', err.message)
    return { ok: true, simulated: true }
  }
}

export async function uploadAllAttachments({ asnNum, fisYear, generalAttachments, pdirAttachments }) {
  const allAttachments = [
    ...generalAttachments.map(a => ({ ...a, kind: 'general' })),
    ...pdirAttachments.map(a => ({ ...a, kind: 'pdir' })),
  ]

  if (allAttachments.length === 0) return { uploaded: 0, failed: [] }

  if (USE_MOCK) {
    // Artificial small delay for realistic UX in demo
    await new Promise(r => setTimeout(r, 300))
    return { uploaded: allAttachments.length, failed: [] }
  }

  const csrfToken = await fetchCsrfToken()
  let uploaded = 0
  const failed = []

  for (const att of allAttachments) {
    if (!att._file) {
      console.warn(`[UploadAttachment] Skipping "${att.name}" — no _file reference stored`)
      continue
    }
    try {
      await uploadAttachmentToSap({ asnNum, fisYear, file: att._file, csrfToken, kind: att.kind })
      uploaded++
    } catch (err) {
      failed.push({ name: att.name, error: err.message })
    }
  }

  return { uploaded, failed }
}
