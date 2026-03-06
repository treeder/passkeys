import { cookieDomain } from './cookies.js'

export function signOut(domainLevels) {
  let domain = cookieDomain(window.location.hostname, domainLevels)
  let c = `session=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${domain}; Path=/;`
  // console.log(c)
  document.cookie = c
  c = `userId=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${domain}; Path=/;`
  // console.log(c)
  document.cookie = c
}
