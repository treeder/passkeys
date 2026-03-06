/**
 * @param {string} hostname - the hostname to use for cookies and rpID
 * @param {number} [domainLevels] - number of domain levels to use for cookies and rpID, default is full domain
 * @returns {string} the cookie domain
 */
export function cookieDomain(hostname, domainLevels) {
  if (domainLevels) {
    return sliceDomain(hostname, domainLevels)
  }
  return hostname
}

export function sliceDomain(domain, levels) {
  if (levels < 2) levels = 2
  let parts = domain.split('.')
  if (parts.length < levels) {
    return domain
  }
  return parts.slice(-levels).join('.')
}
