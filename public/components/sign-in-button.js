import { html, css, LitElement } from 'lit'
import 'material/buttons/button.js'
import { signOut } from '../js/signout.js'

export class SignInButton extends LitElement {
  static styles = [
    // sharedStyles,
    // css`p { color: blue }`
  ]

  static properties = {
    user: { type: Object },
  }

  constructor() {
    super()
    this.user = null
  }

  connectedCallback() {
    super.connectedCallback()
  }
  render() {
    if (this.isLoggedIn()) {
      return html`<md-button color="outlined" @click=${this.signOut}>Sign out</md-button>`
    } else {
      return html`<md-button color="outlined" href="/signin">Sign in</md-button>`
    }
  }
  isLoggedIn() {
    const user = this.user || (typeof window !== 'undefined' ? window.user : null)
    return !!(user && (user.id || user.email))
  }
  async signOut() {
    await signOut()
    if (typeof window !== 'undefined') window.user = null
    window.location.href = '/'
  }
}
customElements.define('sign-in-button', SignInButton)
