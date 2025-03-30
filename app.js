import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { Rend } from 'rend'
import { layout } from './views/layout.js'
import { auth, getUserByEmail, hostURL, hostname } from './auth.js'
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { updateSession } from './sessions.js'
import { nanoid } from 'nanoid'
import { globals } from './globals.js'
import { APIError } from 'api'

const rend = new Rend({
  layout,
})
const app = new Hono()
app.use(async (c, next) => {
  c.req.data = {
    baseURL: hostURL(c.req.raw),
  }
  await next()
})
app.use('*', serveStatic({ root: './public/' }))




export default app