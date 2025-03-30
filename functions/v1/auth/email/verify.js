import { getUserByEmail } from "../../../auth.js"
import { updateSession } from "../../../sessions.js"
import { hostURL } from "../../../utils.js"

export async function onRequest(c) {
  const { searchParams } = new URL(c.request.url)
  let token = searchParams.get('token')
  console.log("/auth/verify", token)
  let r = await c.data.kv.get(`email-token-${token}`)
  if (!r) throw new APIError("auth token not found, please try signing in again", { status: 401 })
  console.log("VERIFY R:", r)
  let rr = JSON.parse(r)

  let user = await getUserByEmail(rr.email)

  let { cookies } = await updateSession(c, {
    userID: user.id,
    email: user.email,
  })

  let url = `${hostURL(c)}`
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