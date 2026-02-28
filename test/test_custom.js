import { API } from 'api'
import { TestKit, assert } from 'testkit'

export async function testCustomDomain(c) {
  console.log('Running testCustomDomain')
  let res = await c.api.fetch('/v2/auth/passkeys/start', { raw: true })
  assert(res.status == 200, 'status is not 200')

  let cookie = res.headers.get('Set-Cookie')
  console.log('Cookie:', cookie)
  assert(cookie, 'Set-Cookie header missing')

  // We expect domain=custom.com
  assert(cookie.includes('Domain=custom.com'), `Cookie should have custom domain. Got: ${cookie}`)
}
