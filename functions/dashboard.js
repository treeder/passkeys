import { html } from 'rend'

export async function onRequest(c) {
  return c.data.rend.html({
    main: render,
    user: c.data.user,
    name: c.data.user?.id || 'nobody',
  })
}

function render(d) {
  return html`
    <h2>Hello ${d.name}!</h2>

    <div>This means you are signed in.</div>
  `
}
