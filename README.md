# Easy to use Passkeys library

Passwordless email and passkey based authentication.

The objective of this is to make it as easy as possible to add passkeys to your app. It's quite complicated
to get right so hopefully this will help you.

This package includes backend code, frontend code and ready to go frontend web components.

## Demo

Check out this demo to see it in action.

[Demo](https://passkeys-3nt.pages.dev/)

## Flow

- New user will enter email address and get sent a magic sign in link.
- They click the link to sign in (common flow).
- After they are signed in, they can then create a passkey (or not, this is optional, users can continue using email sign in if they prefer).
- After a passkey is created, they can use it the next time they try to login instead of using the email way.

## Usage

NOTE: <b>Please create an issue if you notice anything not working in the docs</b>.

### Backend:

```sh
npm install treeder/passkeys
```

Then create a `Passkeys` object to handle everything for you:

```js
let passkeys = new Passkeys({
  appName: 'Passkeys demo', // the name of your app
  baseURL: `${hostURL(c)}/v2/auth`, // base URL of your app including path up to the endpoints below
  kv: c.env.KV, // a key value store with 2 functions: `put(key, value)` and `get(key)`
  mailer: globals.mailer, // a mailer with a send function: `send({to: "email", subject: "subject", body: "body"})`
  logger: c.data.logger, // (optional) a logger with a log function: `log(message)`
  // Callbacks you can use to update your database, see below
})

// Then based on the path after the `baseURL` above:
if (p[0] == 'email') {
  if (p[1] == 'start') {
    return await passkeys.emailStart(c)
  }
  if (p[1] == 'verify') {
    return await passkeys.emailVerify(c)
  }
} else if (p[0] == 'passkeys') {
  if (p[1] == 'new') {
    return await passkeys.new(c)
  }
  if (p[1] == 'start') {
    return await passkeys.start(c)
  }
  if (p[1] == 'create') {
    return await passkeys.create(c)
  }
  if (p[1] == 'verify') {
    return await passkeys.verify(c)
  }
  if (p[1] == 'check') {
    return await passkeys.check(c)
  }
}
```

Callbacks you can use to update your database:

- emailStart({email}): Called when user first enters email, either to sign up or sign in. Good chance to create the
  user and get/set a user ID. If you return an object with a `userId` field, that userId will be stored in the session and passed to emailVerified below. If you don't do this, a new unique ID will be assigned.
- emailSend({ userId, email, token, url }): Lets you send your own verification email. Send it to `email` and include the `url` in the email for the user to click to verify.
- emailVerified({email, userId}): Called after user clicks the verification link in their email and email is verified.
- passkeyVerified({email, userId}): Called after user logs in with a passkey.

You'll need 6 endpoints:

- /email/start
- /email/verify
- /passkeys/new
- /passkeys/create
- /passkeys/start
- /passkeys/verify

See an example of adding these endpoints [here](functions/v2/auth/[[catchall]].js)

### Frontend

There is a [pre-built component](/public/components/sign-in.js) you can just drop in and use or copy it to customize how you want.

#### Using the pre-built component

You can use this to get started quick, then if you need to you can copy it and make changes.

On your sign in page, add:

```html
<script type="module">
  import 'passkeys/public/components/sign-in.js'
</script>

<sign-in baseURL="/v2/auth"></sign-in>
```

Using a CDN:

If you'd like to use a CDN rather than your bundler, the above part stays the same, but add this importmap between the `<head>` tags of your site:

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
      "material/": "https://cdn.jsdelivr.net/gh/treeder/material@2.1/",
      "api": "https://cdn.jsdelivr.net/gh/treeder/api@0/api.js",
      "passkeys/": "https://cdn.jsdelivr.net/gh/treeder/passkeys@1/"
    }
  }
</script>
```
