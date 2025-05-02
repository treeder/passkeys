import { nanoid } from "nanoid"
import { hostname, hostURL } from "./utils.js"
import { getSession, updateSession } from "./sessions.js"
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server"
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers"
import { ConsoleLogger } from "console-logger"
import { APIError } from "api"

export class Passkeys {

  /**
   * @param {Object} opts
   * @param {String} opts.baseURL - the base URL of the app / API that this will use for redirects and links
   * @param {Object} opts.kv - a key value store object with put() and get() methods. 
   * @param {Object} opts.mailer - an object with a send() method
   */
  constructor(opts = {}) {
    this.opts = opts
    if (!this.opts.baseURL) throw new Error("baseURL is required")
    if (!this.opts.kv) throw new Error("kv is required")
    // if (!this.opts.mailer) throw new Error("mailer is required")
    if (!this.opts.logger) {
      this.opts.logger = new ConsoleLogger()
    }
  }

  c2(c) {
    return { request: c.request, kv: this.opts.kv, logger: this.opts.logger }
  }

  async emailStart(c) {
    const input = await c.request.json()

    // todo: callback to let implementor create a user
    let userID = null
    if (this.opts.emailStart) {
      let ur = await this.opts.emailStart(input.email)
      userID = ur.userID
    }
    if (!userID) {
      userID = input.email // nanoid()
    }

    let token = nanoid(30)

    let r = await this.opts.kv.put(`email-token-${token}`, JSON.stringify({
      token,
      email: input.email,
      userID: userID,
    }), { expirationTtl: 60 * 60 })

    let url = `${this.opts.baseURL}/email/verify?token=${token}`
    let ebody = `<a href="${url}">Click here to sign in</a>`
    this.opts.logger.log("auth link:", url) // get the link from the console
    if (this.opts.mailer) {
      await this.opts.mailer.send({
        to: input.email,
        subject: `Sign in to ${this.opts.appName || "my app"}`,
        body: ebody,
      })
      return Response.json({ message: 'Check your email to continue.' })
    } else {
      // send link back to client, for demo
      return Response.json({
        message: "Click link below to verify. This would normally be sent via email, but no mailer is configured.",
        link: url,
      })
    }
  }

  async emailVerify(c) {
    const { searchParams } = new URL(c.request.url)
    let token = searchParams.get('token')
    this.opts.logger.log("/auth/verify", token)
    // we're checking if this token exists in the kv store, if so, then it's verified
    let r = await this.opts.kv.get(`email-token-${token}`)
    if (!r) throw new APIError("auth token not found, please try signing in again", { status: 401 })
    this.opts.logger.log("VERIFY R:", r)
    let rr = JSON.parse(r)

    // let user = await this.opts.getUserByEmail(rr.email)
    let { cookies } = await updateSession(this.c2(c), rr)

    let url = `${hostURL(c)}/signin`
    let headers = new Headers({
      "Location": url,
    })
    for (let cookie of cookies) {
      headers.append("Set-Cookie", cookie)
    }
    return new Response("Email Verified", {
      headers,
      status: 302
    })
  }

  async new(c) {
    this.opts.logger.log("/passkeys/new")
    let sess = await getSession(this.c2(c))
    this.opts.logger.log("sessionData:", sess)

    let options = {
      rpName: this.opts.appName,
      rpID: hostname(c),
      userID: isoUint8Array.fromUTF8String(sess.userID), // isoBase64URL.fromBuffer(c.req.userID),
      userName: sess.email,
      userDisplayName: sess.email, // - can add this for a real username
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
    this.opts.logger.log("REG OPTIONS:", options)
    const res = await generateRegistrationOptions(options)

    await this.putChallenge(c, sess.userID, sess.email, res.challenge)

    return Response.json(res)
  }

  async putChallenge(c, userID, email, challenge) {
    let key = `challenge-${email}`
    this.opts.logger.log("CHALLENGE. key:", key)
    let r = await this.opts.kv.put(key, JSON.stringify(
      {
        challenge: challenge,
        userID: userID,
        username: email,
      }), { expirationTtl: 60 * 60 })
    this.opts.logger.log("kv r:", r)
  }

  async create(c) {

    const input = await c.request.json()

    let userID = input.userID
    userID = isoBase64URL.toUTF8String(userID)
    this.opts.logger.log("userID 2:", userID)

    let sess = await getSession(this.c2(c))
    this.opts.logger.log("sessionData:", sess)

    let r = await this.opts.kv.get(`challenge-${sess.email}`)
    this.opts.logger.log("kv r:", r)
    r = JSON.parse(r)
    this.opts.logger.log("r:", r)
    let verification = await verifyRegistrationResponse({
      response: input.credential,
      expectedChallenge: r.challenge,
      expectedOrigin: "https://" + hostname(c),
      expectedRPID: hostname(c),
    })

    this.opts.logger.log("verification:", verification)
    if (!verification.verified) return Response.json({ error: { message: "verification failed" } }, 401)

    // store authenticator info in db
    const { registrationInfo } = verification
    const {
      credential,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo
    const newPasskey = {
      // Created by `generateRegistrationOptions()` in Step 1
      webAuthnUserID: userID,
      // A unique identifier for the credential
      id: credential.id,
      // The public key bytes, used for subsequent authentication signature verification
      publicKey: credential.publicKey,
      // The number of times the authenticator has been used on this site so far
      counter: credential.counter,
      // How the browser can talk with this credential's authenticator
      transports: credential.transports,
      // Whether the passkey is single-device or multi-device
      deviceType: credentialDeviceType,
      // Whether the passkey has been backed up in some way
      backedUp: credentialBackedUp,
    }
    console.log("storing at", `passkey-${newPasskey.id}`)
    await this.opts.kv.put(`passkey-${newPasskey.id}`, JSON.stringify(newPasskey))

    return Response.json({ verified: verification.verified })
  }

  async start(c) {
    this.opts.logger.log("/passkeys/start")
    const options = await generateAuthenticationOptions({
      rpID: hostname(c),
      // Require users to use a previously-registered authenticator
      // allowCredentials: userAuthenticators.map(authenticator => ({
      //     id: authenticator.credentialID,
      //     type: 'public-key',
      //     transports: authenticator.transports,
      // })),
      // allowCredentials: [],
      userVerification: 'preferred',
    })

    let { cookies } = await updateSession(this.c2(c), {
      challenge: options.challenge,
    })

    let response = Response.json(options)
    for (let cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  }

  async verify(c) {
    let input = await c.request.json()
    this.opts.logger.log("VERIFY INPUT:", input)
    let userID = input.credential.response.userHandle
    this.opts.logger.log("userID from userHandle:", userID)
    userID = isoBase64URL.toUTF8String(userID)
    this.opts.logger.log("userID 2:", userID)

    let passkey = await this.opts.kv.get(`passkey-${input.credential.id}`)
    if (!passkey) {
      throw new Error(`Could not find passkey for user ${this.opts.userID}`)
    }
    passkey = JSON.parse(passkey)
    this.opts.logger.log("passkey:", passkey.id)
    const shallowCopy = { ...passkey }

    let sessionData = await getSession(this.c2(c))
    this.opts.logger.log("sessionData:", sessionData)
    let challenge = sessionData.challenge

    passkey.id = isoBase64URL.fromBuffer(passkey.id) // Uint8Array.from(Object.values(authenticator.credentialID))
    passkey.publicKey = Uint8Array.from(Object.values(passkey.publicKey))  // isoBase64URL.fromBuffer(authenticator.credentialPublicKey) // Uint8Array.from(Object.values(authenticator.credentialPublicKey))
    let vdata = {
      response: input.credential,
      expectedChallenge: challenge,
      expectedOrigin: "https://" + hostname(c),
      expectedRPID: hostname(c),
      credential: {
        id: passkey.id,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: passkey.transports,
      },
    }
    let verification = null
    try {
      verification = await verifyAuthenticationResponse(vdata)
    } catch (error) {
      console.error(error)
      return Response.json({ error: { message: error.message } }, { status: 401 })
    }

    this.opts.logger.log("verification:", verification)
    if (!verification.verified) return Response.json({ error: { message: "verification failed" } }, { status: 401 })

    // update counter
    shallowCopy.counter = verification.authenticationInfo.newCounter
    await this.opts.kv.put(`passkey-${userID}`, JSON.stringify(shallowCopy))

    let { cookies } = await updateSession(this.c2(c), {
      userID: userID,
    })

    let response = Response.json({ verified: verification.verified })
    for (let cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  }

  async check(c) {
    let sess = await getSession(this.c2(c))
    this.opts.logger.log("sessionData:", sess)
    if (!sess) {
      throw new APIError(`Not logged in`, { status: 401 })
    }
    let passkey = await this.opts.kv.get(`passkey-${sess.userID}`)
    if (!passkey) {
      throw new APIError(`Could not find a passkey for user ${sess.userID}`, { status: 404 })
    }
    passkey = JSON.parse(passkey)
    this.opts.logger.log("passkey:", passkey)
    return Response.json({ passkey })
  }
}