import { serialize } from 'cookie-es'

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

/**
 * @param {Object} c - the context object
 * @param {number} [domainLevels] - number of domain levels to use for cookies and rpID, default is full domain
 * @returns {string} the cookie domain
 */
export function cookieDomain(c, domainLevels) {
  let h = hostname(c)
  if (domainLevels) {
    // if domainLevels is a number, we'll strip that many levels off the domain
    let levels = parseInt(domainLevels)
    if (!isNaN(levels)) {
      return sliceDomain(h, levels)
    }
  }
  return h
}

export function sliceDomain(domain, levels) {
  let parts = domain.split('.')
  if (parts.length < levels) {
    return domain
  }
  return parts.slice(-levels).join('.')
}

export function deleteCookies(c, options = {}) {
  let cookies = []
  cookies.push(
    serialize('session', '', {
      path: '/',
      maxAge: 0,
      secure: true,
      domain: cookieDomain(c, options.domainLevels),
    }),
  )
  cookies.push(
    serialize('userId', '', {
      path: '/',
      maxAge: 0,
      secure: true,
      domain: cookieDomain(c, options.domainLevels),
    }),
  )
  return cookies
}
