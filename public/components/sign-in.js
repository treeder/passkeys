import { html, css, LitElement } from 'lit'
import 'material/button/filled-button.js'
import 'material/textfield/filled-text-field.js'
import { api } from 'api'
import { startRegistration, startAuthentication } from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/esm/index.js'
import { styles as sharedStyles } from '../css/styles.js'
import { signOut } from '../js/signout.js'

export class SignIn extends LitElement {

  static styles = [
    sharedStyles,
    css`p { color: blue }`
  ]

  static properties = {

    baseURL: { type: String },
    afterLoginHref: { type: String },

    capable: { type: Boolean },
    hasPasskey: { type: Boolean },
    error: { type: Object },
    success: { type: String },
  }

  constructor() {
    super()

    this.baseURL = ''
    this.afterLoginHref = '/dashboard'

    this.capable = false
    this.hasPasskey = false
    this.error = null
    this.success = null

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
      this.signin2(true) // to start conditional UI
    } else {
      // see if we have a passkey
      try {
        let r = await api(`${this.baseURL}/passkeys/check`, {
          method: "POST",
          body: {},
        })
        console.log("r:", r)
        if (r.numPasskeys > 0) {
          // this.success = { message: "You already have a pass key!" }
          this.hasPasskey = true
        }
      } catch (e) {
        console.log("e:", e)
        // this.error = e
      }
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
            ${this.success.message}
            ${this.success.link ? html`<br><br><a href="${this.success.link}">Click to verify</a>` : ''}
            </div>`
    }

    let s = ''
    if (this.isLoggedIn()) {
      s = html`
          <div class="flex col g24 aic" style="min-width: 400px; padding-top: 40px;">
            ${err}
            ${this.hasPasskey ? html`
              <div>You already have a passkey.
              <br><br>
              <a href="${this.afterLoginHref}">Continue to dashboard</a>.</div>
              `: html`
            <div>
                <a href="${this.afterLoginHref}">Skip this and create passkey later</a>
            </div>
            `}
            <div>
              <md-filled-button @click=${this.createPasskey}>Create Passkey</md-filled-button>
            </div>

            <!--
            <div>
              <md-filled-button @click=${this.signOut}>Sign out</md-filled-button>
            </div>
            -->
          </div>`
      return s // comment this out to test creating and signing in with pass keys
    }

    return html`
        ${s}
        <div style="display: flex; flex-direction: column; gap: 24px; min-width: 400px; padding-top: 40px;">
            ${err}
            <!-- <input type="text" id="email" autocomplete="webauthn"> -->
            <md-filled-text-field label="Email" type="email" id="email" @keyup=${this.keyUpHandler} required autocomplete="webauthn"></md-filled-text-field>
            <md-filled-button @click=${this.emailStart}>Continue</md-filled-button>
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
    signOut()
  }

  keyUpHandler(e) {
    if (e.key === 'Enter') {
      this.emailStart()
    }
  }

  async emailStart() {
    console.log("continue")
    this.error = null
    let emailF = this.renderRoot.getElementById('email')
    if (!emailF.reportValidity()) {
      return
    }
    let email = emailF.value
    console.log("email:", email)
    try {
      let r = await api(`${this.baseURL}/email/start`, {
        method: "POST",
        body: { email: email },
      })
      console.log("r:", r)
      this.success = r
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
    console.log("conditionalUI:", conditionalUI)
    this.error = null
    let challenge
    try {
      challenge = await api(`${this.baseURL}/passkeys/start`, {
        method: "POST",
        body: {},
      })
      console.log("challenge:", challenge)

      // Pass the options to the authenticator and wait for a response
      let cred
      try {
        cred = await startAuthentication({
          optionsJSON: challenge,
          useBrowserAutofill: conditionalUI,
          verifyBrowserAutofillInput: false
        })
        console.log("CRED:", cred)
        // let userID = isoBase64URL.toUTF8String(cred.response.userhandle)
        console.log("USER ID FROM CRED, aka userHandle:", cred.response.userHandle)
      } catch (e) {
        if (conditionalUI) {
          if (e.name == "AbortError") {
            console.log("ignoring conditional abort", e)
            return
          }
        }
        throw e
      }

      let r = await api(`${this.baseURL}/passkeys/verify`, {
        method: "POST",
        body: {
          credential: cred,
        },
      })
      console.log("finish r:", r)
      if (!r.verified) {
        this.error = { message: "Not verified" }
      } else {
        this.success = { message: "You signed in with a passkey!" }
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
    let regOptions
    try {
      regOptions = await api(`${this.baseURL}/passkeys/new`, {
        method: "POST",
        body: {},
      })
      console.log("regOptions:", regOptions)
    } catch (e) {
      console.log("e:", e)
      this.error = e
      return
    }
    let userID = regOptions.user.id
    console.log("USER ID FROM regOptions:", userID)

    let attResp = null
    try {
      // Pass the options to the authenticator and wait for a response
      attResp = await startRegistration({
        optionsJSON: regOptions,
        // useAutoRegister: true, // this errors with NotAllowedError sometimes...
      })
    } catch (error) {
      console.log("error:", error)
      this.error = error
      throw error
    }

    try {
      let r = await api(`${this.baseURL}/passkeys/create`, {
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
        this.success = {
          message: html`Passkey created! Next time you can sign in with it.
          <br><br><a href="${this.afterLoginHref}">Continue to dashboard</a>`
        }
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
