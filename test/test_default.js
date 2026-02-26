import { API } from 'api'
import { TestKit, assert } from 'testkit'

// Helper to setup context
function setup() {
    let apiURL = 'http://localhost:8787'
    let api = new API({
        apiURL,
    })
    return {
        api,
        env: process.env,
    }
}

async function testDefaultDomain(c) {
    console.log('Running testDefaultDomain')
    let res = await c.api.fetch('/v2/auth/passkeys/start', { raw: true })
    assert(res.status == 200, 'status is not 200')

    let cookie = res.headers.get('Set-Cookie')
    console.log('Cookie:', cookie)
    assert(cookie, 'Set-Cookie header missing')

    // We expect domain=localhost (or 127.0.0.1) as it is the default behavior
    assert(cookie.includes('Domain=localhost') || cookie.includes('Domain=127.0.0.1'), 'Cookie should have default domain (localhost)')
    assert(!cookie.includes('Domain=custom.com'), 'Cookie should NOT have custom domain')
}

let c = setup()
let testKit = new TestKit(c, [testDefaultDomain])
await testKit.run()
