# Easy to use Passkeys library

Passwordless email and passkey based authentication.

This package includes both backend code and frontend components. 

## Demo

[Demo](https://passkeys-3nt.pages.dev/)

## Usage

NOTE: <b>these docs may not work as is</b>, I'm writing the docs before making it all work like the docs. 

###  Backend:

```
npm install treeder/passkeys
```

You'll need to pass in the following objects when creating the passkeys object:

- appName: the name of your app
- baseURL: base URL of your app including path up to the endpoints below
- mailer: a mailer with a send function: `send({to: "email", subject: "subject", body: "body"})` 
- kv: a key value store with 2 functions: `put(key, value)` and `get(key)`

Callbacks you can use to update your database:

- emailStart({email}): Called when user first enters email, either to sign up or sign in. Good chance to create the user. If you return an object with a `userID` field, that userID will be stored in the session and passed to emailVerified below.
- emailVerified({email, userID}): Called after email is verified. userID will only be included if it was returned in emailStart.



You'll need 6 endpoints:

- /email/start
- /email/verify
- /passkeys/new
- /passkeys/create
- /passkeys/start
- /passkeys/verify

See an example of adding these endpoints [here](functions/v2/auth/[[catchall]].js)

### Frontend

Add this importmap to the `<head>` tag of your site:

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
    "passkeys/": "https://cdn.jsdelivr.net/gh/treeder/passkeys@1/",
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

## Authenticating after sign in

This handles Authorization headers and cookies for login as well as storing session data. 

TODO: Fill this part in on how to use it. 
