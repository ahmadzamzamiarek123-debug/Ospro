import crypto from "crypto"

const TOKEN_SECRET = process.env.ATTENDANCE_SECRET || "kedis_hima_ospro_2026_secure_key"

/**
 * Generate time-based token for a session
 * Window is 60 seconds (1 minute).
 */
export function generateAttendanceToken(sessionNumber: number, offsetWindows: number = 0): {
  token: string
  sessionNumber: number
  expiresInSeconds: number
} {
  const nowMs = Date.now()
  const windowSizeMs = 60 * 1000 // 60 seconds
  const currentWindow = Math.floor(nowMs / windowSizeMs) + offsetWindows
  const secondsRemaining = 60 - (Math.floor(nowMs / 1000) % 60)

  const payload = `s${sessionNumber}_w${currentWindow}`
  const hmac = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex").slice(0, 16)
  const token = `${sessionNumber}.${currentWindow}.${hmac}`

  return {
    token,
    sessionNumber,
    expiresInSeconds: secondsRemaining || 60
  }
}

/**
 * Verify if attendance token is authentic and within valid time window (current window + 1 window grace period).
 */
export function verifyAttendanceToken(
  token: string,
  expectedSession?: number
): { valid: boolean; sessionNumber: number; reason?: string } {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, sessionNumber: 0, reason: "Token barcode tidak ditemukan" }
    }

    const parts = token.split(".")
    if (parts.length !== 3) {
      return { valid: false, sessionNumber: 0, reason: "Format barcode tidak valid" }
    }

    const [sessStr, windowStr, sig] = parts
    const sessionNumber = parseInt(sessStr, 10)
    const tokenWindow = parseInt(windowStr, 10)

    if (isNaN(sessionNumber) || isNaN(tokenWindow)) {
      return { valid: false, sessionNumber: 0, reason: "Data barcode rusak" }
    }

    if (expectedSession && sessionNumber !== expectedSession) {
      return { valid: false, sessionNumber, reason: `Barcode ini untuk Sesi ${sessionNumber}, bukan Sesi ${expectedSession}` }
    }

    // Verify signature
    const payload = `s${sessionNumber}_w${tokenWindow}`
    const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex").slice(0, 16)
    if (sig !== expectedSig) {
      return { valid: false, sessionNumber, reason: "Tanda tangan barcode tidak valid atau dimanipulasi" }
    }

    // Verify time window: allow current window or previous window (up to ~90s total tolerance)
    const nowMs = Date.now()
    const windowSizeMs = 60 * 1000
    const currentWindow = Math.floor(nowMs / windowSizeMs)

    // Diff in windows
    const diff = currentWindow - tokenWindow

    if (diff < 0) {
      // Future window (clock desync slightly) -> allow if within 1 window
      if (Math.abs(diff) > 1) {
        return { valid: false, sessionNumber, reason: "Waktu perangkat tidak sinkron" }
      }
    } else if (diff > 1) {
      return {
        valid: false,
        sessionNumber,
        reason: "Barcode telah kadaluarsa. Silakan scan ulang barcode terbaru di layar laptop."
      }
    }

    return { valid: true, sessionNumber }
  } catch {
    return { valid: false, sessionNumber: 0, reason: "Gagal memverifikasi barcode" }
  }
}
