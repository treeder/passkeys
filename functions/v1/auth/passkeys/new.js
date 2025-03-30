import { isoUint8Array } from "@simplewebauthn/server/helpers"
import { hostname } from "../../../utils.js"
import { generateRegistrationOptions } from "@simplewebauthn/server"

export async function onRequest(c) {
  console.log("in /signup/start")
  console.log('userid', c.data.userID, 'email:', c.data.user.email, { userID: c.data.userID, email: c.data.user.email })
  let options = {
    rpName: "Thingster",
    rpID: hostname(c),
    userID: isoUint8Array.fromUTF8String(c.data.userID), // isoBase64URL.fromBuffer(c.req.userID),
    userName: c.data.user.email,
    userDisplayName: c.data.user.email, // - can add this for a real username
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

  await putChallenge(c, c.data.userID, c.data.user.email, res.challenge)

  return Response.json(res)
}

async function putChallenge(c, userID, email, challenge) {
  let key = `challenge-${email}`
  console.log("CHALLENGE. key:", key)
  let r = await c.data.kv.put(key, JSON.stringify(
    {
      challenge: challenge,
      userID: userID,
      username: email,
    }), { expiration_ttl: 60 * 60 })
  console.log("kv r:", r)
}