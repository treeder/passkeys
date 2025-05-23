import { html } from "rend"

export async function onRequest(c) {
  // console.log("data:", c.data)
  return c.data.rend.html({
    main: render,
    name: 'World',
  })
}

function render(d) {

  return html`
    <h2>Hello ${d.name}!</h2>

    This is the home page. Please sign in to continue.
  `
}