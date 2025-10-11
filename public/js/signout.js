export function signOut() {
  let c = `session=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${window.location.hostname}; Path=/;`
  // console.log(c)
  document.cookie = c
  c = `userId=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${window.location.hostname}; Path=/;`
  // console.log(c)
  document.cookie = c
}
