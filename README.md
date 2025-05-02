# Easy to use Passkeys library

Passwordless email and passkey based authentication.

The objective of this is to make it as easy as possible to add passkeys to your app. It's quite complicated
to get right so hopefully this will help you. 

This package includes backend code, frontend code and ready to go frontend web components. 

## Demo

[Demo](https://passkeys-3nt.pages.dev/)

## Flow

- New user will enter email address and get sent a magic sign in link. 
- They click the link to sign in (common flow).
- After they are signed in, they can then create a passkey (or not, this is optional, users can continue using email sign in if they prefer).
- After a passkey is created, they can use it the next time they try to login instead of using the email way.

## Usage

NOTE: <b>these docs may not work exactly as intended yet</b>, I'm writing the docs before making it all work like the docs. If you notice something not working as documented, please create an issue. 

###  Backend:

```
npm install treeder/passkeys
```

You'll need to pass in the following objects when creating the passkeys object:

- appName: the name of your app
- baseURL: base URL of your app including path up to the endpoints below
- mailer: a mailer with a send function: `send({to: "email", subject: "subject", body: "body"})` 
- kv: a key value store with 2 functions: `put(key, value)` and `get(key)`
- callbacks: see below

Callbacks you can use to update your database:

- emailStart({email}): Called when user first enters email, either to sign up or sign in. Good chance to create the user. If you return an object with a `userID` field, that userID will be stored in the session and passed to emailVerified below. If you don't do this, a new unique ID will be assigned. 
- emailVerified({email, userID}): Called after email is verified. 
- passkeyVerified({email, userID}): Called after user logs in with a passkey. 

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
