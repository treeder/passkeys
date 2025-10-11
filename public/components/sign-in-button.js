import { html, css, LitElement } from 'lit'
import 'material/buttons/button.js'
import { signOut } from '../js/signout.js'

export class SignInButton extends LitElement {
  static styles = [
    // sharedStyles,
    // css`p { color: blue }`
  ]

  static properties = {}

  constructor() {
    super()
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
    return document.cookie.includes('userId=')
  }
  async signOut() {
    await signOut()
    window.location.href = '/'
  }
}
customElements.define('sign-in-button', SignInButton)
