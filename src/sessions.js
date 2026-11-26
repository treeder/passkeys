import { parse, serialize } from 'cookie-es'
import { nanoid } from 'nanoid'
import { cookieDomain } from './utils.js'

export async function getSession(c) {
  const cookie = c.request.headers.get('cookie') || ''
  let c2 = parse(cookie)
  let sessionID = c2.session
  return await getSessionByID(c, sessionID)
}

export async function getSessionByID(c, sessionID) {
  if (!sessionID) {
    return {}
  }
  let sessionData = await c.kv.get(`session-${sessionID}`)
  if (!sessionData) {
    return {
      id: sessionID,
    }
  }
  sessionData = JSON.parse(sessionData)
  sessionData.id = sessionID
  return sessionData
}

// this will overwrite the session
export async function setSession(c, sessionData, options = {}) {
  const cookie = c.request.headers.get('cookie') || ''
  let c2 = parse(cookie)
  let sessionID = c2.session
  return await putSession(c, sessionID, sessionData, options)
}

async function putSession(c, sessionID, sessionData, options = {}) {
  if (!sessionID) {
    sessionID = nanoid(40)
  }
  const payload = { ...sessionData, id: sessionID }
  let maxAge = 60 * 60 * 24 * 365
  let k = `session-${sessionID}`
  await c.kv.put(k, JSON.stringify(payload), { expirationTtl: maxAge })
  let cookies = [
    serialize('session', sessionID, {
      path: '/',
      secure: true,
      domain: cookieDomain(c, options.domainLevels),
      // httpOnly: true,
      maxAge: maxAge,
    }),
  ]
  return {
    sessionID,
    cookies,
  }
}

// this will merge sessionData with existing session
export async function updateSession(c, sessionData, options = {}) {
  let session = await getSession(c)
  const oldSessionID = session.id
  session = { ...session, ...sessionData }
  const targetSessionID = options.rotate ? null : session.id
  const result = await putSession(c, targetSessionID, session, options)
  if (options.rotate && oldSessionID && oldSessionID !== result.sessionID && typeof c.kv?.delete === 'function') {
    try {
      await c.kv.delete(`session-${oldSessionID}`)
    } catch (e) {}
  }
  return result
}
