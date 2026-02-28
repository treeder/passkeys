import { D1 } from 'flaregun'
import { globals, init } from './globals.js'
import { auth } from '../src/auth.js'
import { deleteCookies } from '../src/sessions.js'

export async function onRequest(c) {
  await init(c)

  c.data.rend = globals.rend
  c.data.d1 = new D1(c.env.D1)
  c.data.kv = c.env.KV

  // c.data.mailer = globals.mailer

  try {
    await auth(c)
  } catch (e) {
    if (e.status == 401) {
      let cookies = deleteCookies(c, { domainLevels: globals.domainLevels })
      let headers = new Headers()
      for (let cookie of cookies) {
        headers.append('Set-Cookie', cookie)
      }
      return new Response(e.message, { status: e.status, headers })
    }
    throw e
  }
  return await c.next()
}
