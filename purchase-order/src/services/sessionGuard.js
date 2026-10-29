// ───────────────────────────────────────────────────────────
// BTP session guard (deployed app only).
//
// When the approuter login session runs out (default: 15 min idle), calls to
// /sap/... no longer return JSON — the approuter answers with its login page
// (HTML), and res.json() fails with "Unexpected token '<'".
//
// This catches that case and reloads the page once, so the approuter can
// sign the user in again and bring them back here.
// ───────────────────────────────────────────────────────────

const RELOAD_KEY = 'po.reauthAt'
const nativeFetch = window.fetch.bind(window)

function isLoginPage(res, body) {
  const type = res.headers.get('content-type') || ''
  return type.includes('text/html') && body.includes('oauth/authorize')
}

if (import.meta.env.PROD) {
  window.fetch = async (input, init) => {
    const res = await nativeFetch(input, init)
    const url = String(input?.url ?? input)

    if (url.includes('/sap/') && (res.headers.get('content-type') || '').includes('text/html')) {
      const body = await res.clone().text()
      if (isLoginPage(res, body)) {
        let last = 0
        try {
          last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
        } catch {
          /* storage unavailable */
        }
        // Reload at most once every 30 s so we can never loop.
        if (Date.now() - last > 30_000) {
          try {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
          } catch {
            /* ignore */
          }
          window.location.reload()
          return new Promise(() => {}) // page is reloading — don't let the caller continue
        }
      }
    }
    return res
  }
}
