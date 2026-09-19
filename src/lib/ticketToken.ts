import crypto from "crypto"

const SECRET = process.env.TICKET_SECRET || "kedis-ospro-ticket-signature-2026-key"

/**
 * Membuat signature HMAC untuk NIM
 */
function createSignature(nim: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`ticket:${nim.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 16)
}

/**
 * Menghasilkan token Barcode/QR resmi untuk tiket maba
 * Format: KEDIS-TICKET:v1:<nim>:<signature>
 */
export function generateTicketToken(nim: string): string {
  const cleanNim = nim.trim().toLowerCase()
  const sig = createSignature(cleanNim)
  return `KEDIS-TICKET:v1:${cleanNim}:${sig}`
}

/**
 * Memverifikasi validitas token barcode dari pemindai kamera
 */
export function verifyTicketToken(token: string): { valid: boolean; nim?: string; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Data barcode kosong atau tidak terbaca" }
  }

  const trimmed = token.trim()

  // 1. Dukung format resmi KEDIS-TICKET
  if (trimmed.startsWith("KEDIS-TICKET:v1:")) {
    const parts = trimmed.split(":")
    if (parts.length !== 4) {
      return { valid: false, error: "Format barcode tiket tidak sesuai SOP" }
    }

    const nim = parts[2]
    const signature = parts[3]
    const expectedSig = createSignature(nim)

    if (signature !== expectedSig) {
      return { valid: false, error: "Barcode tiket tidak sah atau telah dimodifikasi" }
    }

    return { valid: true, nim }
  }

  // 2. Fallback: jika berupa NIM langsung (misal input manual darurat atau barcode angka murni)
  const isNumericOnly = /^[0-9A-Za-z_-]{4,20}$/.test(trimmed)
  if (isNumericOnly) {
    return { valid: true, nim: trimmed.toLowerCase() }
  }

  return { valid: false, error: "Barcode bukan tiket resmi KEDIS OSPRO 2026" }
}
