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

  console.log('\nAll multi-passkey unit tests passed successfully!')
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
