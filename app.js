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

app.get('/', async (c) => {
  return rend.html({
    main: './views/index.js',
    name: 'World',
  })
})

app.post('/auth/email/continue', async (c) => {
  try {
    const body = await c.req.json()
    let token = nanoid(30)
    let r = await globals.kv.set(`email-token-${token}`, JSON.stringify({
      token,
      email: body.email,
    }), { expiration_ttl: 60 * 60 })
    let url = `${c.req.data.baseURL}/auth/verify?token=${token}`
    let ebody = `Click here to sign in: <a href="${url}">${url}</a>`
    console.log("auth link:", url) // get the link from the console
    // THIS IS WHERE YOU'D SEND AN EMAIL
    // await sendEmail(c, body.email, "Sign into My App", ebody)
    return c.json({ message: 'Check your email to continue.' })
  } catch (e) {
    console.log("error:", e)
    return c.json({ error: { message: e.message } }, 500)
  }
})

// verifies the email link
app.get('/auth/verify', async (c) => {
  let token = c.req.query('token')
  console.log("/auth/verify", token)
  let r = await globals.kv.get(`email-token-${token}`)
  if (!r) throw new APIError("auth token not found, please try signing in again", { status: 401 })
  console.log("VERIFY R:", r)
  let rr = JSON.parse(r)

  let user = await getUserByEmail(rr.email)

  await updateSession(c, {
    userID: user.id,
    email: user.email,
  })

  return c.redirect('/')
})

// For creating a new pass key
app.post('/auth/passkeys/new/start', auth, async (c) => {
  console.log("in /signup/start")
  try {
    console.log("in /signup/start")
    console.log('userid', c.req.userID, 'email:', c.req.user.email, { userID: c.req.userID, email: c.req.user.email })
    let options = {
      rpName: "Thingster",
      rpID: hostname(c.req.raw),
      userID: isoUint8Array.fromUTF8String(c.req.userID), // isoBase64URL.fromBuffer(c.req.userID),
      userName: c.req.user.email,
      userDisplayName: c.req.user.email, // - can add this for a real username
      attestationType: 'none',
      // Prevent users from re-registering existing authenticators
      // excludeCredentials: userAuthenticators.map(authenticator => ({
      //     id: authenticator.credentialID,
      //     type: 'public-key',
      //     // Optional
      //     transports: authenticator.transports,
      // })),
      excludeCredentials: [],
      // See "Guiding use of authenticators via authenticatorSelection" below
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
        // authenticatorAttachment: 'platform',
      },
    }
    console.log("REG OPTIONS:", options)
    const res = await generateRegistrationOptions(options)

    await putChallenge(c.req.userID, c.req.user.email, res.challenge)

    return c.json(res)
  } catch (e) {
    console.log("/auth/signup/start error:", e)
    return c.json({ error: { message: e.message } }, 500)
  }

})

async function putChallenge(userID, email, challenge) {
  let key = `challenge-${email}`
  console.log("CHALLENGE. key:", key)
  let r = await globals.kv.set(key, JSON.stringify(
    {
      challenge: challenge,
      userID: userID,
      username: email,
    }), { expiration_ttl: 60 * 60 })
  console.log("kv r:", r)
}

// verifying the newly created passkey
app.post('/auth/passkeys/new/finish', async (c) => {
  console.log("in /signup/finish")

  try {

    const body = await c.req.json()
    console.log("body:", body)

    let userID = body.userID
    userID = isoBase64URL.toUTF8String(userID)
    console.log("userID 2:", userID)

    let user = await globals.d1.prepare("select * from users where id = ?").bind(userID).first()
    let r = await globals.kv.get(`challenge-${user.email}`)
    console.log("kv r:", r)
    r = JSON.parse(r)
    console.log("r:", r)

    let verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: r.challenge,
      expectedOrigin: "https://" + hostname(c.req.raw),
      expectedRPID: hostname(c.req.raw),
    })

    console.log("verification:", verification)
    if (!verification.verified) return c.json({ error: { message: "verification failed" } }, 401)

    // store authenticator info in db
    const { registrationInfo } = verification
    const {
      credentialPublicKey,
      credentialID,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports,
    } = registrationInfo
    const newAuthenticator = {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports,
    }
    await globals.kv.set(`passkey-${r.userID}`, JSON.stringify(newAuthenticator))

    return c.json({ verified: verification.verified })
  } catch (e) {
    console.log("/auth/signup/start error:", e)
    return c.json({ error: { message: e.message } }, 500)
  }

})

// when user is signing in with a passkey
app.post('/auth/passkeys/signin/start', async (c) => {
  console.log("in /signin/start")
  try {
    const options = await generateAuthenticationOptions({
      // challenge: challenge,
      rpID: hostname(c.req.raw),
      // Require users to use a previously-registered authenticator
      // allowCredentials: userAuthenticators.map(authenticator => ({
      //     id: authenticator.credentialID,
      //     type: 'public-key',
      //     transports: authenticator.transports,
      // })),
      // allowCredentials: [],
      userVerification: 'preferred',
    })

    await updateSession(c, {
      challenge: options.challenge,
    })

    return c.json(options)
  } catch (e) {
    console.log("/auth/signup/start error:", e)
    return c.json({ error: { message: e.message } }, 500)
  }
})


// verifying sign in with a passkey
app.post('/auth/passkeys/signin/finish', async (c) => {
  console.log("in /signin/finish")
  try {
    const body = await c.req.json()
    console.log("body:", body)

    // console.log("CRED RESPONSE:", body.credential.response)
    let userID = body.credential.response.userHandle
    console.log("userID from userHandle:", userID)
    userID = isoBase64URL.toUTF8String(userID)
    console.log("userID 2:", userID)

    let authenticator = await globals.kv.get(`passkey-${userID}`)
    console.log("authenticator:", authenticator)
    if (!authenticator) {
      throw new Error(`Could not find authenticator for user ${userID}`)
    }
    authenticator = JSON.parse(authenticator)
    const shallowCopy = { ...authenticator }

    let sessionData = await getSession(c)
    // console.log("sessionData:", sessionData)
    let challenge = sessionData.challenge

    // console.log("credential:", body.credential)
    // const path = "./cred.json";
    // await Bun.write(path, JSON.stringify(body.credential, null, 2))

    authenticator.credentialID = isoBase64URL.fromBuffer(authenticator.credentialID) // Uint8Array.from(Object.values(authenticator.credentialID))
    authenticator.credentialPublicKey = Uint8Array.from(Object.values(authenticator.credentialPublicKey))  // isoBase64URL.fromBuffer(authenticator.credentialPublicKey) // Uint8Array.from(Object.values(authenticator.credentialPublicKey))
    let vdata = {
      response: body.credential,
      expectedChallenge: challenge,
      expectedOrigin: "https://" + hostname(c.req.raw),
      expectedRPID: hostname(c.req.raw),
      authenticator: authenticator,
    }
    let verification = null
    try {
      verification = await verifyAuthenticationResponse(vdata)
    } catch (error) {
      console.error(error)
      return c.json({ error: { message: error.message } }, 401)
    }

    console.log("verification:", verification)
    if (!verification.verified) return c.json({ error: { message: "verification failed" } }, 401)

    // update counter
    shallowCopy.counter = verification.authenticationInfo.newCounter
    await globals.kv.set(`passkey-${userID}`, JSON.stringify(shallowCopy))

    await updateSession(c, {
      userID: userID,
    })

    return c.json({ verified: verification.verified })
  } catch (e) {
    console.log("/auth/signup/start error:", e)
    return c.json({ error: { message: e.message } }, 500)
  }
})


export default app