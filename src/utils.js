export function extractHost(c) {
  let req = c.request
  let h = req.headers.get('x-forwarded-host') || req.headers.get('host')
  let ret = {}
  if (!h) {
    let url = new URL(c.request.url)
    ret.hostname = url.hostname
    ret.port = url.port
  } else {
    let split = h.split(':')
    ret.hostname = split[0]
    ret.port = split[1]
  }
  return ret
}

export function hostname(c) {
  return extractHost(c).hostname
}

export function cookieDomain(c) {
  let domainLevels = c.domainLevels
  if (!domainLevels && c.env && c.env.COOKIE_DOMAIN) {
    domainLevels = c.env.COOKIE_DOMAIN
  }
  if (domainLevels) {
    // if domainLevels is a number, we'll strip that many levels off the domain
    let levels = parseInt(domainLevels)
    if (!isNaN(levels)) {
      let h = hostname(c)
      let parts = h.split('.')
      if (parts.length < levels) {
        return h
      }
      return parts.slice(-levels).join('.')
    }
    return domainLevels
  }
  return hostname(c)
}

export function hostURL(c) {
  let h2 = extractHost(c)
  let h = h2.hostname
  if (h.includes('localhost') || h.includes('127.0.0.1')) {
    h = 'http://' + h + (h2.port ? ':' + h2.port : '')
  } else {
    h = 'https://' + h
  }
  return h
}
