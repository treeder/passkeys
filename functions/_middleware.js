import { globals, init } from './globals.js'

export async function onRequest(c) {
  await init(c)

  c.data.rend = globals.rend

  return await c.next()
}