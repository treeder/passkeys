import { APIError } from "api"


export async function onRequest(c) {
  if (!c.data.userID) {
    throw new APIError(`Not logged in`, { status: 404 })
  }
  let passkey = await c.data.kv.get(`passkey-${c.data.userID}`)
  if (!passkey) {
    throw new APIError(`Could not find passkey for user ${c.data.userID}`, { status: 404 })
  }
  passkey = JSON.parse(passkey)
  console.log("passkey:", passkey)
  return Response.json({ passkey })
}