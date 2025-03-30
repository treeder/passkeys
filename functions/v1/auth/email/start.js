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
  let ebody = `<a href="${url}">Click here to sign in</a>`
  console.log("auth link:", url) // get the link from the console
  // THIS IS WHERE YOU'D SEND AN EMAIL
  // await sendEmail(c, body.email, "Sign into My App", ebody)
  console.log("data;", c.data)
  if (c.data.mailer) {
    await c.data.mailer.send(c, {
      to: body.email,
      subject: `Sign in to ${c.data.app?.name || "my app"}`,
      body: ebody,
    })
    return Response.json({ message: 'Check your email to continue.' })
  } else {
    // send link back to client, for demo
    return Response.json({
      message: "Click link below to verify. This would normally be sent via email, but no mailer is setup.",
      link: url,
    })
  }
}