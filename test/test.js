import { API } from 'api'
import { TestKit, assert } from 'testkit'
import { testDefaultDomain } from './test_default.js'
import { testNumericDomain } from './test_numeric.js'

// Helper to setup context
function setup() {
  let apiURL = 'http://localhost:8788' // Note: using port 8789
  let api = new API({
    apiURL,
  })
  return {
    api,
    env: process.env,
  }
}

let c = setup()
let testKit = new TestKit(c, [testDefaultDomain, testNumericDomain])
await testKit.run()
