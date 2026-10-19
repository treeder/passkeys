import { html } from 'rend'

export async function onRequest(c) {
  return c.data.rend.html({
    main: render,
    user: c.data.user,
    name: 'World',
  })
}

function render(d) {
  return html`
    <h2>Hello ${d.name}!</h2>

    <script type="module">
      import '/components/sign-in.js'
    </script>

    <div class="flex jcc w100">
      ${
        d.user
          ? html`<sign-in baseURL="/v2/auth" user="${JSON.stringify(d.user).replace(/"/g, '&quot;')}"></sign-in>`
          : html`<sign-in baseURL="/v2/auth"></sign-in>`
      }
    </div>
  `
}
