import { parse, serialize } from "cookie-es"
import { globals } from "./globals.js"
import { nanoid } from "nanoid"
import { hostname } from "./functions/utils.js"

// currently active session cache
const sessions = {}

export async function getSession(c) {
  const cookie = c.request.headers.get('cookie') || ''
  let c2 = parse(cookie)
  // console.log("cookie:", c2)
  // if (c2.session) {
  //   key = c2.session
  // }
  let sessionID = c2.session
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
  return await putSession(c, sessionID, sessionData)
}

async function putSession(c, sessionID, sessionData) {
  if (!sessionID) {
    sessionID = nanoid(40)
  }
  sessionData.id = sessionID
  let maxAge = 60 * 60 * 24 * 365
  let k = `session-${sessionID}`
  console.log("PUTTING SESSION:", k, sessionData)
  await c.data.kv.put(k, JSON.stringify(sessionData), { expiration_ttl: maxAge })
  sessions[sessionID] = sessionData
  let cookies = [serialize('session', sessionID, {
    path: '/',
    secure: true,
    domain: hostname(c),
    // httpOnly: true,
    maxAge: maxAge,
  })]
  // const headers = new Headers({
  //   "Set-Cookie": serialize('session', sessionID, {
  //     path: '/',
  //     secure: true,
  //     // domain: 'example.com',
  //     // httpOnly: true,
  //     maxAge: maxAge,
  //   })
  // })
  if (sessionData.userID) {
    // const headers = new Headers({
    //   "Set-Cookie": "name1=value1",
    // })

    // setCookie(c, 'userID', sessionData.userID, {
    //   path: '/',
    //   secure: true,
    //   // domain: 'example.com',
    //   // httpOnly: true,
    //   maxAge: maxAge,
    // })
    cookies.push(serialize('userID', sessionData.userID, {
      path: '/',
      secure: true,
      domain: hostname(c),
      // httpOnly: true,
      maxAge: maxAge,
    }))
  }
  return {
    sessionID,
    cookies,
  }
}

// this will merge sessionData with existing session
export async function updateSession(c, sessionData) {
  let session = await getSession(c)
  session = { ...session, ...sessionData }
  return await putSession(c, session.id, session)
}