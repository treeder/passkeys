import { D1 } from 'flaregun'
import { globals, init } from './globals.js'
import { auth } from './auth.js'

export async function onRequest(c) {
  await init(c)

  c.data.rend = globals.rend
  c.data.d1 = new D1(c.env.D1)
  c.data.kv = c.env.KV

  // c.data.mailer = globals.mailer

  await auth(c)

  return await c.next()
}