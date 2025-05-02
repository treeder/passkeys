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

    <script type="module">
    import '/components/sign-in.js'
    </script>

    <div class="flex jcc w100">
      <sign-in baseURL="/v2/auth"></sign-in>
    </div>
  `
}