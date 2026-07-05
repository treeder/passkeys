import { parse } from 'cookie-es'
import { html } from 'rend'

export async function onRequest(c) {
  let cookies = parse(c.request.headers.get('cookie') || '')
  return c.data.rend.html({
    main: render,
    name: cookies.userId || 'World',
    userId: cookies.userId,
    isLoggedIn: cookies.session,
  })
}

function render(d) {
  return html`
    <h2>Hello ${d.name}!</h2>

    ${d.isLoggedIn
      ? html`You are logged in. <a href="/dashboard">Go to dashboard</a>`
      : html`Please sign in to continue.`}
  `
}
