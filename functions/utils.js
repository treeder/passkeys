export function hostname(c) {
  let req = c.request
  let domain = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (domain) {
    domain = domain.split(':')[0]
    domain = domain.split(':')[0] // remove port
  }
  return domain
}

export function hostURL(c) {
  let domain = hostname(c)
  domain = 'https://' + domain
  // console.log('config domain', domain)
  return domain
}