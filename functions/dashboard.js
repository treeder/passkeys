import { parse } from "cookie-es"
import { html } from "rend"

export async function onRequest(c) {
  let cookies = parse(c.request.headers.get('cookie') || '')
  return c.data.rend.html({
    main: render,
    name: cookies.userID || "nobody",
  })
}

function render(d) {

  return html`
    <h2>Hello ${d.name}!</h2>

    <div>This means you are signed in.</div>
  `
}