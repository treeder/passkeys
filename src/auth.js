import { APIError } from "api"
import { parse } from "cookie-es"

export async function auth(c, next) {
  if (c.request.headers.get('Authorization')) {
    let az = c.request.headers.get('Authorization')
    // console.log("AUTHORIZATION HEADER", az)
    // console.log("COOKIE TOO?", getCookie(c, 'session'))

    let parts = az.split(' ')
    if (parts.length != 2) {
      throw new APIError("Authorization header is not in the correct format", { status: 400 })
    }
    let type = parts[0]
    let token = parts[1]

    if (type == 'apiKey') {
      let apiKey = await globals.d1.prepare(`SELECT * FROM apiKeys WHERE key = ?`).bind(token).first()
      if (!apiKey) {
        throw new APIError("API key not found", { status: 401 })
      }

    } else if (type == 'Cookie') {
      return await setupUserSession(c, token)
    }
  } else {
    const cookie = c.request.headers.get('cookie') || ''
    let c2 = parse(cookie)
    let sessionID = c2.session
    if (sessionID) {
      return await setupUserSession(c, sessionID)
    }
  }
}

async function setupUserSession(c, sessionID) {
  // Fetch any session data or user information you want here and attach it to the request object so you can use it in your routes
  // c.req.userID = user.id
  c.data.sessionID
  let r = await c.data.kv.get(`session-${sessionID}`)
  if (!r) {
    throw new APIError("Session not found", { status: 401 })
  }
  let session = JSON.parse(r)
  // console.log("SESSION:", session)
  c.data.userID = session.userID
  c.data.user = {
    id: session.userID,
    email: session.email,
  }
}

export async function getUserByEmail(email) {
  return {
    id: email,
    email: email,
  }
}