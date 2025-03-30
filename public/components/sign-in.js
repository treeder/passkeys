import { html, css, LitElement } from 'lit'
import 'material/button/filled-button.js'
import 'material/textfield/filled-text-field.js'
import { api } from 'api'
// import { startRegistration } from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/dist/bundle/index.umd.min.js'
import { startRegistration, startAuthentication } from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/esm/index.js'
import { styles as sharedStyles } from '/css/styles.js'


export class SignIn extends LitElement {
  static styles = [
    sharedStyles,
    css`p { color: blue }`
  ]

  static properties = {
    capable: { type: Boolean },
    name: { type: String },
    error: { type: Object },
    success: { type: String },
  }

  constructor() {
    super()
    this.name = 'Somebody'
    this.capable = false

    this.error = null
    this.success = ''

  }

  connectedCallback() {
    super.connectedCallback()
    this.checkCapabilities()

  }

  async checkCapabilities() {
    if (window.PublicKeyCredential) {
      console.log("PublicKeyCredential is available")
      this.capable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      console.log("capable:", this.capable)
    }
    if (!this.capable) return

    if (!this.isLoggedIn()) {
      console.log("not logged in, starting conditional UI")
      // this.signin2(true) // to start conditional UI
    }

  }


  render() {
    if (!this.capable) {
      return html`Can't do passkeys on this device.`
    }
    let err = ''
    if (this.error) {
      err = html`<div class="error">${this.error.message}</div>`
    }
    if (this.success) {
      return html`<div class="success" style="margin-top: 40px;">
            ${this.success}
            </div>`
    }

    let s = ''
    if (this.isLoggedIn()) {
      s = html`
          <div class="flex col g24 aic" style="min-width: 400px; padding-top: 40px;">
            ${err}
            <md-filled-button @click=${this.createPasskey}>Create Passkey</md-filled-button>
            <div>
                <a href="/dashboard">Skip this and create passkey later</a>
            </div>
            <div>
              <md-filled-button @click=${this.signOut}>Sign out</md-filled-button>
            </div>
          </div>`
      return s // comment this out to test creating and signing in with pass keys
    }

    return html`
        ${s}
        <div style="display: flex; flex-direction: column; gap: 24px; min-width: 400px; padding-top: 40px;">
            ${err}
            <!-- <input type="text" id="email" autocomplete="webauthn"> -->
            <md-filled-text-field label="Email" type="email" id="email" @keyup=${this.keyUpHandler} required autocomplete="webauthn"></md-filled-text-field>
            <md-filled-button @click=${this.continue}>Continue</md-filled-button>
            <!-- <md-filled-button @click=${this.createPasskey}>Continue</md-filled-button> -->
            <div>
            <hr>
            </div>
            <md-filled-button @click=${this.signin}>Sign in with Passkey</md-filled-button>
        </div>
        `
  }

  isLoggedIn() {
    return document.cookie.includes('userID=')
  }

  signOut() {
    let c = `session=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${window.location.hostname}; Path=/;`
    console.log(c)
    document.cookie = c
    c = `userID=; expires=Thu, 01 Jan 1970 00:00:01 UTC; Secure; Domain=${window.location.hostname}; Path=/;`
    console.log(c)
    document.cookie = c
    window.location.href = '/'
  }


  keyUpHandler(e) {
    if (e.key === 'Enter') {
      this.continue()
    }
  }

  async continue() {
    console.log("continue")
    this.error = null
    let usernameF = this.renderRoot.getElementById('email')
    if (!usernameF.reportValidity()) {
      return
    }
    let username = usernameF.value
    console.log("username:", username)
    try {
      let r = await api(`/v1/auth/email/start`, {
        method: "POST",
        body: { email: username },
      })
      console.log("r:", r)
      this.success = r.message
    } catch (e) {
      console.log("e:", e)
      this.error = e
      return
    }
  }

  // for onclick
  async signin() {
    this.signin2(false)
  }

  async signin2(conditionalUI = false) {
    console.log("credGet")
    console.log("conditionalUI:", conditionalUI)
    this.error = null
    let challenge
    try {
      challenge = await api(`/v1/auth/passkeys/start`, {
        method: "POST",
        body: {},
      })
      console.log("challenge:", challenge)

      // Pass the options to the authenticator and wait for a response
      let cred = await startAuthentication({ optionsJSON: challenge, useBrowserAutofill: conditionalUI, verifyBrowserAutofillInput: false })
      console.log("CRED:", cred)
      // let userID = isoBase64URL.toUTF8String(cred.response.userhandle)
      console.log("USER ID FROM CRED, aka userHandle:", cred.response.userhandle)

      let r = await api(`/v1/auth/passkeys/verify`, {
        method: "POST",
        body: {
          credential: cred,
        },
      })
      console.log("finish r:", r)
      if (!r.verified) {
        this.error = { message: "Not verified" }
      } else {
        this.success = "You signed in with a passkey!"
      }
      window.location.href = '/'
    } catch (e) {
      console.log("e:", e)
      if (!(e.message.includes("autofill") || e.message.includes("autocomplete"))) {
        this.error = e
      }
      return
    }

  }

  async createPasskey() {
    this.error = null
    let challenge
    try {
      challenge = await api(`/v1/auth/passkeys/new`, {
        method: "POST",
        body: {},
      })
      console.log("challenge:", challenge)
    } catch (e) {
      console.log("e:", e)
      this.error = e
      return
    }
    let userID = challenge.user.id
    console.log("USER ID FROM CHALLENGE:", userID)

    let attResp = null
    try {
      // Pass the options to the authenticator and wait for a response
      attResp = await startRegistration({ optionsJSON: challenge, useAutoRegister: true })
    } catch (error) {
      console.log("error:", error)
      this.error = error
      throw error
    }

    try {
      let r = await api(`/v1/auth/passkeys/create`, {
        method: "POST",
        body: {
          credential: attResp,
          userID: userID,
        },
      })
      console.log("finish r:", r)
      if (!r.verified) {
        this.error = { message: "Not verified" }
      } else {
        this.success = "Passkey created! Next time you can sign in with it."
      }
    } catch (e) {
      console.log("e:", e)
      this.error = e
      return
    }

  }

  bufferToBase64URL(buffer) {
    const bytes = new Uint8Array(buffer)
    let string = ''
    bytes.forEach(b => string += String.fromCharCode(b))

    const base64 = btoa(string)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  base64URLToBuffer(base64URL) {
    const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (base64.length % 4)) % 4
    return Uint8Array.from(atob(base64.padEnd(base64.length + padLen, '=')), c => c.charCodeAt(0))
  }

}
customElements.define('sign-in', SignIn)