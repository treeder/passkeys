import { getCookie, setCookie } from "hono/cookie"
import { globals } from "./globals.js"
import { nanoid } from "nanoid"

// currently active session cache
const sessions = {}

export async function getSession(c) {
  let sessionID = getCookie(c, 'session')
  return await getSessionByID(sessionID)
}

export async function getSessionByID(sessionID) {
  // console.log("get session cookie:", sessionID)
  if (!sessionID) {
    return {}
    // throw new Error("session not found: no session cookie")
  }
  if (sessions[sessionID]) {
    return sessions[sessionID]
  }
  let sessionData = await globals.kv.get(`session-${sessionID}`)
  // console.log("sessionData:", sessionData)
  if (!sessionData) {
    return {
      id: sessionID
    }
    // throw new Error("session not found: no session data")
  }
  sessionData = JSON.parse(sessionData)
  sessionData.id = sessionID
  sessions[sessionID] = sessionData
  return sessionData
}

// this will overwrite the session
export async function setSession(c, sessionData) {
  let sessionID = getCookie(c, 'session')
  console.log("set session sessionID:", sessionID)
  await putSession(c, sessionID, sessionData)
}

async function putSession(c, sessionID, sessionData) {
  if (!sessionID) {
    sessionID = nanoid(40)
  }
  sessionData.id = sessionID
  let maxAge = 60 * 60 * 24 * 365
  let k = `session-${sessionID}`
  console.log("PUTTING SESSION:", k, sessionData)
  await globals.kv.set(k, JSON.stringify(sessionData), { expiration_ttl: maxAge })
  sessions[sessionID] = sessionData
  setCookie(c, 'session', sessionID, {
    path: '/',
    secure: true,
    // domain: 'example.com',
    // httpOnly: true,
    maxAge: maxAge,
    // expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
    // sameSite: 'Strict',
  })
  if (sessionData.userID) {
    setCookie(c, 'userID', sessionData.userID, {
      path: '/',
      secure: true,
      // domain: 'example.com',
      // httpOnly: true,
      maxAge: maxAge,
    })
  }
}

// this will merge sessionData with existing session
export async function updateSession(c, sessionData) {
  let session = await getSession(c)
  session = { ...session, ...sessionData }
  await putSession(c, session.id, session)

}