import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server"
import { hostname } from "../../../utils.js"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import { getSession, updateSession } from "../../../sessions.js"

export async function onRequest(c) {
  let body = await c.request.json()
  console.log("body:", body)

  // console.log("CRED RESPONSE:", body.credential.response)
  let userID = body.credential.response.userHandle
  console.log("userID from userHandle:", userID)
  userID = isoBase64URL.toUTF8String(userID)
  console.log("userID 2:", userID)

  let passkey = await c.data.kv.get(`passkey-${userID}`)
  if (!passkey) {
    throw new Error(`Could not find passkey for user ${c.data.userID}`)
  }
  passkey = JSON.parse(passkey)
  console.log("passkey:", passkey)
  const shallowCopy = { ...passkey }

  let sessionData = await getSession(c)
  console.log("sessionData:", sessionData)
  let challenge = sessionData.challenge

  // console.log("credential:", body.credential)
  // const path = "./cred.json";
  // await Bun.write(path, JSON.stringify(body.credential, null, 2))

  passkey.id = isoBase64URL.fromBuffer(passkey.id) // Uint8Array.from(Object.values(authenticator.credentialID))
  passkey.publicKey = Uint8Array.from(Object.values(passkey.publicKey))  // isoBase64URL.fromBuffer(authenticator.credentialPublicKey) // Uint8Array.from(Object.values(authenticator.credentialPublicKey))
  let vdata = {
    response: body.credential,
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

  console.log("verification:", verification)
  if (!verification.verified) return c.json({ error: { message: "verification failed" } }, 401)

  // update counter
  shallowCopy.counter = verification.authenticationInfo.newCounter
  await c.data.kv.put(`passkey-${userID}`, JSON.stringify(shallowCopy))

  let { cookies } = await updateSession(c, {
    userID: userID,
  })

  let response = Response.json({ verified: verification.verified })
  for (let cookie of cookies) {
    response.headers.append('Set-Cookie', cookie)
  }
  return response
}