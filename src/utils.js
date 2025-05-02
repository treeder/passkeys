export function hostname(c) {
  let req = c.request
  let h = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (h) {
    h = h.split(':')[0]
    h = h.split(':')[0] // remove port
  }
  return h
}

export function hostURL(c) {
  let h = hostname(c)
  h = 'https://' + h
  return h
}