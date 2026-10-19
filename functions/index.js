import { html } from 'rend'

export async function onRequest(c) {
  return c.data.rend.html({
    main: render,
    user: c.data.user,
    name: c.data.user?.id || 'World',
    userId: c.data.user?.id,
    isLoggedIn: Boolean(c.data.user?.id),
  })
}

function render(d) {
  return html`
    <h2>Hello ${d.name}!</h2>

    ${
      d.isLoggedIn
        ? html`You are logged in. <a href="/dashboard">Go to dashboard</a>`
        : html`Please sign in to continue.`
    }
  `
}
