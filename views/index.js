import { html } from 'rend'

export function render(d) {
  return html`
    <h2>Hello ${d.name}!</h2>

    <script type="module">
    import '/components/sign-in.js'
    </script>

    <div class="flex jcc w100">
    <sign-in></sign-in>
    </div>
  `
}