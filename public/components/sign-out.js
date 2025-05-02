import { html, css, LitElement } from 'lit'
import 'material/button/outlined-button.js'
import { signOut } from '../js/signout.js'

export class SignOut extends LitElement {

  static styles = [
    // sharedStyles,
    // css`p { color: blue }`
  ]

  static properties = {

  }

  constructor() {
    super()
  }

  connectedCallback() {
    super.connectedCallback()
  }
  render() {
    if (this.isLoggedIn()) {
      return html`
    <md-outlined-button @click=${this.signOut}>Sign out</md-outlined-button>
    `
    } else {
      return html`<md-outlined-button href="/signin">Sign in</md-outlined-button>`
    }
  }
  isLoggedIn() {
    return document.cookie.includes('userID=')
  }
  async signOut() {
    await signOut()
    window.location.href = '/'
  }
}
customElements.define('sign-out', SignOut)