import { nanoid } from "nanoid"
import { hostURL } from "../../../utils.js"

export async function onRequest(c) {
  const body = await c.request.json()
  let token = nanoid(30)
  let r = await c.data.kv.put(`email-token-${token}`, JSON.stringify({
    token,
    email: body.email,
  }), { expiration_ttl: 60 * 60 })
  let url = `${hostURL(c)}/v1/auth/email/verify?token=${token}`
  let ebody = `Click here to sign in: <a href="${url}">${url}</a>`
  console.log("auth link:", url) // get the link from the console
  // THIS IS WHERE YOU'D SEND AN EMAIL
  // await sendEmail(c, body.email, "Sign into My App", ebody)
  if (c.data.mailer) {
    await c.data.mailer.send({
      to: body.email,
      subject: "Sign into My App",
      html: ebody,
    })
  }
  return Response.json({ message: 'Check your email to continue.' })
}