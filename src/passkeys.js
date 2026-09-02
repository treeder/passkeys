import { nanoid } from 'nanoid'
import { cookieDomain, hostname, hostURL } from './utils.js'
import { getSession, updateSession } from './sessions.js'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers'
import { ConsoleLogger } from 'console-logger'
import { APIError } from 'api'

/**
 * @typedef {Object} PasskeysOptions
 * @property {String} [appName] - the name of your app
 * @property {String} baseURL - the base URL of the app / API used for passkey workflows
 * @property {String} [afterEmailVerifyURL] - the URL to redirect to after email verification
 * @property {Object} kv - a key value store object with put() and get() methods.
 * @property {Object} [mailer] - an object with a send() method
 * @property {Object} [logger] - a logger object with a log() method
 * @property {Number} [domainLevels] - number of domain levels to use for cookies and rpID, default is full domain
 * @property {Function} [emailStart]
 * @property {Function} [emailSend]
 * @property {Function} [emailVerified]
 * @property {Function} [passkeyVerified]
 */

export class Passkeys {
  /**
   * @param {PasskeysOptions} [opts]
   */
  constructor(opts) {
    /** @type {PasskeysOptions} */
    this.opts = /** @type {PasskeysOptions} */ (opts || {})
    if (!this.opts.baseURL) throw new Error('baseURL is required')
    if (!this.opts.kv) throw new Error('kv is required')
    if (!this.opts.logger) {
      this.opts.logger = new ConsoleLogger()
    }
  }

  c2(c) {
    return {
      request: c.request,
      kv: this.opts.kv,
      logger: this.opts.logger,
      env: c.env,
    }
  }

  async emailStart(c) {
    const input = await c.request.json()
    if (input.email) {
      input.email = input.email.trim().toLowerCase()
    }

    // todo: callback to let implementor create a user
    let userId = null
    if (this.opts.emailStart) {
      let ur = await this.opts.emailStart({ email: input.email })
      if (ur) {
        userId = ur.userId
      }
    }
    if (!userId) {
      userId = input.email // nanoid()
    }

    let token = nanoid(30)

    let r = await this.opts.kv.put(
      `email-token-${token}`,
      JSON.stringify({
        token,
        email: input.email,
        userId: userId,
      }),
      { expirationTtl: 60 * 60 },
    )

    let url = `${this.opts.baseURL}/email/verify?token=${token}`
    let ebody = `<a href="${url}">Click here to sign in</a>`
    this.opts.logger.log('auth link:', url) // get the link from the console
    if (this.opts.mailer) {
      await this.opts.mailer.send({
        to: input.email,
        subject: `Sign in to ${this.opts.appName || 'my app'}`,
        body: ebody,
      })
      return Response.json({ message: 'Check your email to continue.' })
    } else if (this.opts.emailSend) {
      // callback to send your own email
      await this.opts.emailSend({ userId, email: input.email, token, url })
      return Response.json({ message: 'Check your email to continue.' })
    } else {
      // send link back to client, for demo
      return Response.json({
        message: 'Click link below to verify. This would normally be sent via email, but no mailer is configured.',
        link: url,
      })
    }
  }

  async emailVerify(c) {
    const { searchParams } = new URL(c.request.url)
    let token = searchParams.get('token')
    // we're checking if this token exists in the kv store, if so, then it's verified
    let r = await this.opts.kv.get(`email-token-${token}`)
    if (!r) throw new APIError('auth token not found, please try signing in again', { status: 401 })
    let rr = JSON.parse(r)

    // let user = await this.opts.getUserByEmail(rr.email)
    let { cookies } = await updateSession(this.c2(c), rr, { domainLevels: this.opts.domainLevels })

    if (this.opts.emailVerified) {
      await this.opts.emailVerified({ email: rr.email, userId: rr.userId })
    }

    let url = this.opts.afterEmailVerifyURL || `${hostURL(c)}/signin`
    let headers = new Headers({
      Location: url,
    })
    for (let cookie of cookies) {
      headers.append('Set-Cookie', cookie)
    }
    return new Response('Email Verified', {
      headers,
      status: 302,
    })
  }

  async new(c) {
    let sess = await getSession(this.c2(c))
    let emailOrId = sess.email || sess.userId

    let user = null
    if (sess.userId) {
      let r = await this.opts.kv.get(`users-${sess.userId}`)
      if (r) {
        user = JSON.parse(r)
      }
    }

    const excludeCredentials =
      user && Array.isArray(user.passkeys)
        ? user.passkeys.map((authenticator) => ({
            id: authenticator.id,
            transports: authenticator.transports,
          }))
        : []

    let options = {
      rpName: this.opts.appName,
      rpID: cookieDomain(this.c2(c), this.opts.domainLevels),
      userID: isoUint8Array.fromUTF8String(sess.userId), // isoBase64URL.fromBuffer(c.req.userId),
      userName: emailOrId || 'user',
      userDisplayName: emailOrId || 'user', // - can add this for a real username
      /** @type {'none'} */
      attestationType: 'none',
      excludeCredentials,
      // See "Guiding use of authenticators via authenticatorSelection" below
      authenticatorSelection: {
        /** @type {'required'} */
        residentKey: 'required',
        /** @type {'preferred'} */
        userVerification: 'preferred',
        // authenticatorAttachment: 'platform',
      },
    }
    const res = await generateRegistrationOptions(options)

    await this.putChallenge(c, sess.userId, emailOrId, res.challenge)

    return Response.json(res)
  }

  async putChallenge(c, userId, emailOrId, challenge) {
    let key = `challenge-${emailOrId}`
    await this.opts.kv.put(
      key,
      JSON.stringify({
        challenge: challenge,
        userId: userId,
        username: emailOrId,
      }),
      { expirationTtl: 60 * 60 },
    )
  }

  async create(c) {
    const input = await c.request.json()

    let userId = input.userId
    userId = isoBase64URL.toUTF8String(userId)

    let sess = await getSession(this.c2(c))
    let emailOrId = sess.email || sess.userId || userId

    let r = await this.opts.kv.get(`challenge-${emailOrId}`)
    if (!r && sess.userId) {
      r = await this.opts.kv.get(`challenge-${sess.userId}`)
    }
    if (!r) {
      throw new APIError('Registration challenge expired or missing. Please try again.', { status: 400 })
    }
    r = JSON.parse(r)
    if (!r || !r.challenge) {
      throw new APIError('Invalid registration challenge. Please try again.', { status: 400 })
    }
    let verification = await verifyRegistrationResponse({
      response: input.credential,
      expectedChallenge: r.challenge,
      expectedOrigin: hostURL(c),
      expectedRPID: cookieDomain(this.c2(c), this.opts.domainLevels),
      requireUserVerification: false,
    })
    if (!verification.verified) return Response.json({ error: { message: 'verification failed' } }, { status: 401 })

    // store authenticator info in db
    const { registrationInfo } = verification
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo
    const newPasskey = {
      // Created by `generateRegistrationOptions()` in Step 1
      webAuthnUserID: userId,
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
    await this.opts.kv.put(`passkeys-${newPasskey.id}`, JSON.stringify(newPasskey))

    // also store all passkeys for user to find them later
    let user = null
    let rUser = await this.opts.kv.get(`users-${userId}`)
    if (rUser) {
      user = JSON.parse(rUser)
    }
    if (!user) {
      user = {
        id: userId,
        email: sess.email,
        passkeys: [],
      }
    }
    if (!Array.isArray(user.passkeys)) {
      user.passkeys = []
    }
    if (sess.email && !user.email) {
      user.email = sess.email
    }
    const existingIndex = user.passkeys.findIndex((pk) => pk.id === newPasskey.id)
    if (existingIndex >= 0) {
      user.passkeys[existingIndex] = newPasskey
    } else {
      user.passkeys.push(newPasskey)
    }
    await this.opts.kv.put(`users-${userId}`, JSON.stringify(user))

    return Response.json({ verified: verification.verified })
  }

  async start(c) {
    const options = await generateAuthenticationOptions({
      rpID: cookieDomain(this.c2(c), this.opts.domainLevels),
      // Require users to use a previously-registered authenticator
      // allowCredentials: userAuthenticators.map(authenticator => ({
      //     id: authenticator.credentialID,
      //     type: 'public-key',
      //     transports: authenticator.transports,
      // })),
      // allowCredentials: [],
      userVerification: 'preferred',
    })

    let { cookies } = await updateSession(
      this.c2(c),
      {
        challenge: options.challenge,
      },
      { domainLevels: this.opts.domainLevels },
    )

    let response = Response.json(options)
    for (let cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  }

  async verify(c) {
    let input = await c.request.json()
    let userId = input.credential.response.userHandle
    userId = isoBase64URL.toUTF8String(userId)

    let passkey = await this.opts.kv.get(`passkeys-${input.credential.id}`)
    if (!passkey) {
      throw new Error(`Could not find passkey for user ${userId}`)
    }
    passkey = JSON.parse(passkey)
    const shallowCopy = { ...passkey }

    let sessionData = await getSession(this.c2(c))
    let challenge = sessionData.challenge

    passkey.id = isoBase64URL.fromBuffer(passkey.id) // Uint8Array.from(Object.values(authenticator.credentialID))
    passkey.publicKey = Uint8Array.from(Object.values(passkey.publicKey)) // isoBase64URL.fromBuffer(authenticator.credentialPublicKey) // Uint8Array.from(Object.values(authenticator.credentialPublicKey))
    let vdata = {
      response: input.credential,
      expectedChallenge: challenge,
      expectedOrigin: hostURL(c),
      expectedRPID: cookieDomain(c, this.opts.domainLevels),
      credential: {
        id: passkey.id,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: false,
    }
    let verification = null
    try {
      verification = await verifyAuthenticationResponse(vdata)
    } catch (error) {
      console.error(error)
      return Response.json({ error: { message: error.message } }, { status: 401 })
    }

    if (!verification.verified) return Response.json({ error: { message: 'verification failed' } }, { status: 401 })

    // update counter
    shallowCopy.counter = verification.authenticationInfo.newCounter
    await this.opts.kv.put(`passkeys-${shallowCopy.id}`, JSON.stringify(shallowCopy))

    let userStr = await this.opts.kv.get(`users-${userId}`)
    if (userStr) {
      let user = JSON.parse(userStr)
      if (Array.isArray(user.passkeys)) {
        let pk = user.passkeys.find((p) => p.id === shallowCopy.id)
        if (pk) {
          pk.counter = shallowCopy.counter
          await this.opts.kv.put(`users-${userId}`, JSON.stringify(user))
        }
      }
    }

    if (this.opts.passkeyVerified) {
      await this.opts.passkeyVerified({ userId, email: sessionData.email })
    }

    let { cookies } = await updateSession(
      this.c2(c),
      {
        userId: userId,
      },
      { domainLevels: this.opts.domainLevels },
    )

    let response = Response.json({ verified: verification.verified })
    for (let cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  }

  async check(c) {
    let sess = await getSession(this.c2(c))
    if (!sess || !sess.userId) {
      throw new APIError(`Not logged in`, { status: 401 })
    }
    let user = await this.opts.kv.get(`users-${sess.userId}`)
    if (!user) {
      return Response.json({ message: '0 passkeys found', numPasskeys: 0 })
    }
    user = JSON.parse(user)
    const numPasskeys = user.passkeys ? user.passkeys.length : 0
    return Response.json({ message: `${numPasskeys} passkeys found`, numPasskeys })
  }
}
