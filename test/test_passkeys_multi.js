import { Passkeys } from '../src/passkeys.js'
import assert from 'node:assert'

class MockKV {
  constructor() {
    this.store = new Map()
  }
  async get(key) {
    return this.store.get(key) || null
  }
  async put(key, value) {
    this.store.set(key, value)
  }
  async delete(key) {
    this.store.delete(key)
  }
}

async function runTests() {
  console.log('Running multi-passkey tests...')

  const kv = new MockKV()
  const passkeys = new Passkeys({
    baseURL: 'http://localhost:8788',
    appName: 'Test App',
    kv,
  })

  const userId = 'user-123'
  const sessionData = {
    userId,
    email: 'user@example.com',
  }

  // Mock context helper
  const createMockContext = (sessionObj = sessionData, body = {}) => ({
    request: {
      url: 'http://localhost:8788/passkeys/test',
      headers: new Headers({
        cookie: `session=test-sess`,
      }),
      json: async () => body,
    },
    data: {},
    env: {},
  })

  // Put mock session in KV
  await kv.put('session-test-sess', JSON.stringify(sessionData))

  // Test 1: Passkeys.new when user has no passkeys
  {
    const c = createMockContext()
    const res = await passkeys.new(c)
    const data = await res.json()
    assert.strictEqual(res.status, 200)
    assert.deepStrictEqual(data.excludeCredentials, [], 'excludeCredentials should be empty for new user')
    console.log('✔ Test 1 passed: new() returns empty excludeCredentials for user with no passkeys')
  }

  // Test 2: Passkeys.check when user has no passkeys
  {
    const c = createMockContext()
    const res = await passkeys.check(c)
    const data = await res.json()
    assert.strictEqual(data.numPasskeys, 0)
    console.log('✔ Test 2 passed: check() returns 0 passkeys')
  }

  // Test 3: Set up legacy user record without passkeys array
  {
    await kv.put(
      `users-${userId}`,
      JSON.stringify({
        id: userId,
        email: sessionData.email,
      }),
    )
    const c = createMockContext()
    const res = await passkeys.check(c)
    const data = await res.json()
    assert.strictEqual(data.numPasskeys, 0, 'Legacy user without passkeys field should return 0')
    const resNew = await passkeys.new(c)
    const dataNew = await resNew.json()
    assert.deepStrictEqual(dataNew.excludeCredentials, [], 'Legacy user should have empty excludeCredentials')
    console.log('✔ Test 3 passed: handles legacy user records without passkeys field gracefully')
  }

  // Test 4: Set up existing passkeys in user record and test Passkeys.new()
  {
    const existingPasskeys = [
      {
        id: 'cred-1',
        publicKey: [1, 2, 3],
        counter: 0,
        transports: ['internal'],
      },
      {
        id: 'cred-2',
        publicKey: [4, 5, 6],
        counter: 5,
        transports: ['usb', 'nfc'],
      },
    ]

    await kv.put(
      `users-${userId}`,
      JSON.stringify({
        id: userId,
        email: sessionData.email,
        passkeys: existingPasskeys,
      }),
    )

    const c = createMockContext()
    const res = await passkeys.new(c)
    const data = await res.json()
    assert.strictEqual(data.excludeCredentials.length, 2)
    assert.strictEqual(data.excludeCredentials[0].id, 'cred-1')
    assert.strictEqual(data.excludeCredentials[1].id, 'cred-2')
    console.log('✔ Test 4 passed: new() populates excludeCredentials from existing passkeys')
  }

  // Test 5: Passkeys.check when user has 2 passkeys
  {
    const c = createMockContext()
    const res = await passkeys.check(c)
    const data = await res.json()
    assert.strictEqual(data.numPasskeys, 2)
    console.log('✔ Test 5 passed: check() returns 2 passkeys')
  }

  // Test 6: Passkeys.list returns user's passkeys with metadata
  {
    const unauthC = {
      request: {
        url: 'http://localhost:8788/passkeys/list',
        headers: new Headers(),
        json: async () => ({}),
      },
      data: {},
      env: {},
    }
    const unauthRes = await passkeys.list(unauthC)
    assert.strictEqual(unauthRes.status, 401)

    const c = createMockContext()
    const res = await passkeys.list(c)
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(Array.isArray(data.passkeys), true)
    assert.strictEqual(data.passkeys.length, 2)
    assert.strictEqual(data.passkeys[0].id, 'cred-1')
    assert.strictEqual(data.passkeys[0].name, 'Security Key')
    assert.strictEqual(data.passkeys[1].id, 'cred-2')
    console.log('✔ Test 6 passed: list() handles unauthorized and returns formatted passkeys')
  }

  // Test 7: Passkeys.delete validates ownership and removes passkey
  {
    await kv.put('passkeys-cred-1', JSON.stringify({ id: 'cred-1' }))
    await kv.put('passkeys-cred-2', JSON.stringify({ id: 'cred-2' }))

    // Missing passkey ID returns 400
    const emptyC = createMockContext(sessionData, {})
    const emptyRes = await passkeys.delete(emptyC)
    assert.strictEqual(emptyRes.status, 400)

    // Non-existent passkey returns 404
    const notFoundC = createMockContext(sessionData, { id: 'non-existent' })
    const notFoundRes = await passkeys.delete(notFoundC)
    assert.strictEqual(notFoundRes.status, 404)

    // Delete cred-1 via body
    const deleteC = createMockContext(sessionData, { id: 'cred-1' })
    const deleteRes = await passkeys.delete(deleteC)
    assert.strictEqual(deleteRes.status, 200)
    const deleteData = await deleteRes.json()
    assert.strictEqual(deleteData.success, true)

    // Verify cred-1 is deleted from KV and user record
    assert.strictEqual(await kv.get('passkeys-cred-1'), null)
    const userRaw = await kv.get(`users-${userId}`)
    const userObj = JSON.parse(userRaw)
    assert.strictEqual(userObj.passkeys.length, 1)
    assert.strictEqual(userObj.passkeys[0].id, 'cred-2')

    // Verify check() and list() now reflect 1 passkey
    const checkRes = await passkeys.check(createMockContext())
    const checkData = await checkRes.json()
    assert.strictEqual(checkData.numPasskeys, 1)

    console.log('✔ Test 7 passed: delete() validates ID/ownership, deletes from KV, and updates user record')
  }

  // --- Test 8: emailStart & emailVerify preserves afterLoginHref / redir redirect ---
  {
    const kv = new MockKV()
    const passkeys = new Passkeys({
      kv,
      appName: 'TestApp',
      baseURL: 'http://localhost:8787/auth',
    })

    const cStart = {
      request: new Request('http://localhost:8787/auth/email/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', afterLoginHref: '/custom-landing' }),
      }),
      data: {},
      cookies: {},
    }

    const startRes = await passkeys.emailStart(cStart)
    const startData = await startRes.json()
    assert(startData.link)
    const verifyUrl = new URL(startData.link)
    const token = verifyUrl.searchParams.get('token')

    const cVerify = {
      request: new Request(`http://localhost:8787/auth/email/verify?token=${token}`),
      data: {},
      cookies: {},
    }

    const verifyRes = await passkeys.emailVerify(cVerify)
    assert.strictEqual(verifyRes.status, 302)
    assert.strictEqual(verifyRes.headers.get('Location'), '/custom-landing')

    console.log('✔ Test 8 passed: emailStart and emailVerify preserve afterLoginHref')
  }

  // --- Test 9: getSession always reads fresh KV data without stale in-memory cache ---
  {
    const { getSession, updateSession } = await import('../src/sessions.js')
    const kv = new MockKV()
    const preAuthSessionId = 'pre-auth-sess-123'
    const req = new Request('http://localhost:8787/auth/passkeys/start', {
      headers: { cookie: `session=${preAuthSessionId}` },
    })

    // First write challenge-only session (no userId)
    await updateSession({ request: req, kv }, { challenge: 'abc-challenge' })
    const before = await getSession({ request: req, kv })
    assert.strictEqual(before.challenge, 'abc-challenge')
    assert.strictEqual(before.userId, undefined)

    // Simulate another isolate updating KV directly with userId
    await kv.put(`session-${preAuthSessionId}`, JSON.stringify({ id: preAuthSessionId, userId: 'user-999' }))
    const after = await getSession({ request: req, kv })
    assert.strictEqual(after.userId, 'user-999', 'getSession should read updated userId from KV, not a stale cache')

    console.log('✔ Test 9 passed: getSession reads fresh session data from KV without stale cache')
  }

  // --- Test 10: emailVerify rotates session ID away from pre-auth challenge session and consumes token ---
  {
    const kv = new MockKV()
    const passkeys = new Passkeys({
      kv,
      appName: 'TestApp',
      baseURL: 'http://localhost:8787/auth',
    })

    // Start passkey challenge first (simulating conditional UI on /signin)
    const startPasskeyRes = await passkeys.start({
      request: new Request('http://localhost:8787/auth/passkeys/start', { method: 'POST' }),
      data: {},
    })
    const startCookie = startPasskeyRes.headers.get('Set-Cookie')
    const oldSessionId = startCookie.match(/session=([^;]+)/)[1]
    assert(await kv.get(`session-${oldSessionId}`), 'pre-auth session should exist in KV')

    // Start email sign-in
    const emailStartRes = await passkeys.emailStart({
      request: new Request('http://localhost:8787/auth/email/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: `session=${oldSessionId}` },
        body: JSON.stringify({ email: 'rotate@example.com', afterLoginHref: '/home' }),
      }),
      data: {},
    })
    const { link } = await emailStartRes.json()
    const token = new URL(link).searchParams.get('token')

    // Verify email with pre-auth cookie present
    const verifyRes = await passkeys.emailVerify({
      request: new Request(`http://localhost:8787/auth/email/verify?token=${token}`, {
        headers: { cookie: `session=${oldSessionId}` },
      }),
      data: {},
    })
    assert.strictEqual(verifyRes.status, 302)
    assert.strictEqual(verifyRes.headers.get('Location'), '/home')
    assert.strictEqual(verifyRes.headers.get('Cache-Control'), 'private, no-store')

    const newCookie = verifyRes.headers.get('Set-Cookie')
    const newSessionId = newCookie.match(/session=([^;]+)/)[1]
    assert.notStrictEqual(newSessionId, oldSessionId, 'session ID must be rotated on login')
    assert.strictEqual(await kv.get(`session-${oldSessionId}`), null, 'old pre-auth session should be deleted')
    assert.strictEqual(await kv.get(`email-token-${token}`), null, 'email token should be deleted after use')

    const newSession = JSON.parse(await kv.get(`session-${newSessionId}`))
    assert.strictEqual(newSession.userId, 'rotate@example.com')
    assert.strictEqual(
      newSession.challenge,
      undefined,
      'consumed challenge should not persist into authenticated session',
    )

    console.log('✔ Test 10 passed: emailVerify rotates session ID, deletes old session/token, and sets no-store')
  }

  // --- Test 11: sign-in component redirects passkey login to afterLoginHref and forwards afterLoginHref in emailStart ---
  {
    const fs = await import('node:fs/promises')
    const signInSource = await fs.readFile(new URL('../public/components/sign-in.js', import.meta.url), 'utf8')
    assert(
      signInSource.includes("window.location.href = this.afterLoginHref || '/'"),
      'sign-in.js should redirect passkey login to this.afterLoginHref || /',
    )
    assert(
      signInSource.includes('body.afterLoginHref = this.afterLoginHref'),
      'sign-in.js should forward explicit afterLoginHref in emailStart()',
    )
    console.log('✔ Test 11 passed: sign-in.js uses afterLoginHref for passkey redirect and emailStart')
  }

  // --- Test 12: setSession supports rotate and clears stale fields on account switch ---
  {
    const { getSession, setSession } = await import('../src/sessions.js')
    const kv = new MockKV()
    const oldSessionId = 'alice-sess-123'
    await kv.put(
      `session-${oldSessionId}`,
      JSON.stringify({ id: oldSessionId, userId: 'alice', email: 'alice@example.com', staleField: 'old' }),
    )

    const req = new Request('http://localhost:8787/auth/passkeys/verify', {
      headers: { cookie: `session=${oldSessionId}` },
    })
    const { sessionID: rotatedId } = await setSession(
      { request: req, kv },
      { userId: 'bob', email: 'bob@example.com' },
      { rotate: true },
    )
    assert.notStrictEqual(rotatedId, oldSessionId, 'setSession with rotate should generate a new session ID')
    assert.strictEqual(await kv.get(`session-${oldSessionId}`), null, 'rotate should delete old session')

    const rotatedReq = new Request('http://localhost:8787/auth/check', {
      headers: { cookie: `session=${rotatedId}` },
    })
    const rotatedSession = await getSession({ request: rotatedReq, kv })
    assert.strictEqual(rotatedSession.userId, 'bob')
    assert.strictEqual(rotatedSession.email, 'bob@example.com')
    assert.strictEqual(rotatedSession.staleField, undefined, 'setSession should not inherit stale fields')

    // Also verify emailVerify logs when email token deletion fails and does not leak prior session fields
    const logged = []
    const kvWithDeleteErr = new MockKV()
    const origDelete = kvWithDeleteErr.delete.bind(kvWithDeleteErr)
    kvWithDeleteErr.delete = async (key) => {
      if (key.startsWith('email-token-')) {
        throw new Error('kv delete failed')
      }
      return origDelete(key)
    }
    await kvWithDeleteErr.put(
      'session-prev-user',
      JSON.stringify({ id: 'prev-user', userId: 'alice', email: 'alice@example.com', staleField: 'leak' }),
    )
    const passkeys = new Passkeys({
      kv: kvWithDeleteErr,
      appName: 'TestApp',
      baseURL: 'http://localhost:8787/auth',
      logger: { log: (...args) => logged.push(args) },
    })
    const startRes = await passkeys.emailStart({
      request: new Request('http://localhost:8787/auth/email/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bob@example.com' }),
      }),
      data: {},
    })
    const { link } = await startRes.json()
    const token = new URL(link).searchParams.get('token')
    const verifyRes = await passkeys.emailVerify({
      request: new Request(`http://localhost:8787/auth/email/verify?token=${token}`, {
        headers: { cookie: 'session=prev-user' },
      }),
      data: {},
    })
    const newId = verifyRes.headers.get('Set-Cookie').match(/session=([^;]+)/)[1]
    const bobSession = JSON.parse(await kvWithDeleteErr.get(`session-${newId}`))
    assert.strictEqual(bobSession.userId, 'bob@example.com')
    assert.strictEqual(bobSession.staleField, undefined, 'emailVerify should not inherit stale session fields')
    assert(
      logged.some((args) => String(args[0]).includes('Failed to delete email token')),
      'emailVerify should log when email token deletion fails',
    )

    console.log('✔ Test 12 passed: setSession rotates cleanly and emailVerify logs delete errors')
  }

  console.log('\nAll multi-passkey unit tests passed successfully!')
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
