import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers"
import { hostname } from "../../../utils.js"
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server"

export async function onRequest(c) {
  console.log("in /signup/finish")

  const body = await c.request.json()
  // console.log("body:", body)

  let userID = body.userID
  userID = isoBase64URL.toUTF8String(userID)
  console.log("userID 2:", userID)

  // let user = await globals.d1.prepare("select * from users where id = ?").bind(userID).first()
  let r = await c.data.kv.get(`challenge-${c.data.user.email}`)
  console.log("kv r:", r)
  r = JSON.parse(r)
  console.log("r:", r)
  let verification = await verifyRegistrationResponse({
    response: body.credential,
    expectedChallenge: r.challenge,
    expectedOrigin: "https://" + hostname(c),
    expectedRPID: hostname(c),
  })

  console.log("verification:", verification)
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
  await c.data.kv.put(`passkey-${c.data.userID}`, JSON.stringify(newPasskey))

  return Response.json({ verified: verification.verified })
}
