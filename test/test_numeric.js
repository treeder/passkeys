import { API } from 'api'
import { TestKit, assert } from 'testkit'

// Helper to setup context
function setup() {
    let apiURL = 'http://localhost:8789' // Note: using port 8789
    let api = new API({
        apiURL,
    })
    return {
        api,
        env: process.env,
    }
}

async function testNumericDomain(c) {
    console.log('Running testNumericDomain')
    // We expect COOKIE_DOMAIN=2
    // We send Host: a.b.c.example.com
    // We expect Domain=example.com (last 2 parts)

    let res = await c.api.fetch('/v2/auth/passkeys/start', {
        raw: true,
        headers: {
            'X-Forwarded-Host': 'a.b.c.example.com'
        }
    })
    assert(res.status == 200, 'status is not 200')

    let cookie = res.headers.get('Set-Cookie')
    console.log('Cookie:', cookie)
    assert(cookie, 'Set-Cookie header missing')

    // We expect domain=example.com
    assert(cookie.includes('Domain=example.com'), `Cookie should have domain=example.com. Got: ${cookie}`)
}

async function testNumericDomain2(c) {
    console.log('Running testNumericDomain2')
    // We expect COOKIE_DOMAIN=2
    // We send Host: localhost
    // We expect Domain=localhost (fallback because parts < levels? Or handled by slice?)
    // 'localhost'.split('.') -> ['localhost']. length 1. 1 < 2 -> returns h ('localhost').

    let res = await c.api.fetch('/v2/auth/passkeys/start', {
        raw: true,
        headers: {
            'X-Forwarded-Host': 'localhost'
        }
    })
    assert(res.status == 200, 'status is not 200')

    let cookie = res.headers.get('Set-Cookie')
    console.log('Cookie:', cookie)
    assert(cookie, 'Set-Cookie header missing')

    // We expect domain=localhost
    assert(cookie.includes('Domain=localhost'), `Cookie should have domain=localhost. Got: ${cookie}`)
}

let c = setup()
let testKit = new TestKit(c, [testNumericDomain, testNumericDomain2])
await testKit.run()
