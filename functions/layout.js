import { slot } from 'rend'

export async function layout(d) {
  return `
    ${header(d)}

    <div class="container">
        <div class="flex g12">
            <div>${await slot('rail', d)}</div>
            <div class="w100">${await slot('main', d)}</div>
        </div>
    </div>

    ${footer(d)}
    `
}

export function header(d) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Pass Keys Demo</title>
    <link rel="stylesheet" href="/css/styles.css">

    <script type="importmap">
    {
      "imports": {
        "lit": "https://cdn.jsdelivr.net/npm/lit@3/index.js",
        "lit/": "https://cdn.jsdelivr.net/npm/lit@3/",
        "@lit/localize": "https://cdn.jsdelivr.net/npm/@lit/localize/lit-localize.js",
        "@lit/reactive-element": "https://cdn.jsdelivr.net/npm/@lit/reactive-element@1/reactive-element.js",
        "@lit/reactive-element/": "https://cdn.jsdelivr.net/npm/@lit/reactive-element@1/",
        "lit-element/lit-element.js": "https://cdn.jsdelivr.net/npm/lit-element@4/lit-element.js",
        "lit-html": "https://cdn.jsdelivr.net/npm/lit-html@3/lit-html.js",
        "lit-html/": "https://cdn.jsdelivr.net/npm/lit-html@3/",
        "material/": "https://cdn.jsdelivr.net/gh/treeder/material@2.1/",
        "api": "https://cdn.jsdelivr.net/gh/treeder/api@0/api.js"
      }
    }
    </script>

  </head>
<body>
  ${nav(d)}
    `
}

function nav(d) {
  return `
  <script type="module">
    import '/components/sign-out.js'
  </script>
  <div style="background-color: #eee; margin-bottom: 20px; padding-top: 10px; padding-bottom: 10px;">
      <div class="flex jcsb g12 pl12 pr12 aic">
          <div class="flex g12 aic">
              <div style="font-weight: bold; font-size: larger;">
                  <a href="https://github.com/treeder/passkeys">Passkeys Rock</a>
              </div>
          </div>
          <div>
              <!-- Right stuff -->
              <div>
                <sign-out></sign-out>
              </div>
              
          </div>
      </div>
  </div>
  `
}

export function footer(d) {
  return `
  <div class="container" style="border-top: 1px solid silver; margin-top: 20px; padding-top: 20px;>
      <div class="flex" style="flex-direction: column; gap: 12px;">
      <a href="https://github.com/treeder/passkeys">Passkeys</a>
      <div>No more passwords!</div>
  </div>
</body>
</html>
    `
}
