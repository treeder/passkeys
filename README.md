# Easy to use Passkeys library

Passwordless email and pass key based authentication.

This package includes both backend code and frontend components.

## Demo

[Demo](https://passkeys-3nt.pages.dev/)

## Usage

NOTE: <b>these docs may not work as is</b>, I'm writing the docs before making it all work like the docs. 

###  Backend:

```
npm install treeder/passkeys
```

You'll need to configure:

- a mailer with a send(c, opts) function: `c.data.mailer = YOURMAILER`
- a key value store: `c.data.kv = YOURKV`

You'll need 6 endpoints:

- /v1/auth/email/start
- /v1/auth/email/verify
- /v1/passkeys/new
- /v1/passkeys/create
- /v1/passkeys/start
- /v1/passkeys/verify

See code for each of these [here](functions/v1/auth)


### Frontend

Add this to the `<head>` tag of your site:

```html
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
    "material/": "https://cdn.jsdelivr.net/gh/treeder/material@1/",
    "api": "https://cdn.jsdelivr.net/gh/treeder/api@0/api.js",
    "passkeys/": "https://cdn.jsdelivr.net/gh/treeder/passkeys@0/",
  }
}
</script>
```

Then on your sign in page, add:

```html
<script type="module">
import 'passkeys/public/components/sign-in.js'
</script>

<sign-in></sign-in>
```

## Dev

```sh
make run
```
