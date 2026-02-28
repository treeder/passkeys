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

let c = setup()
let testKit = new TestKit(c, [testDefaultDomain, testNumericDomain, testCustomDomain])
await testKit.run()
