const TOKEN_KEY = 'ejust_admin_token'

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Called once on app boot. Reads ?t=<jwt> from the URL, saves it to
 * localStorage, then removes the param so the token isn't visible in the bar.
 */
export function initFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const t = params.get('t')
  if (t) {
    saveToken(t)
    params.delete('t')
    const clean = params.toString()
    const newUrl = window.location.pathname + (clean ? `?${clean}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
  }
}
