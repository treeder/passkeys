import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { hostname } from "../../../utils.js"
import { updateSession } from "../../../sessions.js"

export async function onRequest(c) {
  console.log("in /signin/start")
  const options = await generateAuthenticationOptions({
    // challenge: challenge,
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

  let { cookies } = await updateSession(c, {
    challenge: options.challenge,
  })

  let response = Response.json(options)
  for (let cookie of cookies) {
    response.headers.append('Set-Cookie', cookie)
  }
  return response
}