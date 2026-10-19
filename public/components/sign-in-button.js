import { html, css, LitElement } from 'lit'
import 'material/buttons/button.js'
import state from 'state'
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
    if (this.user) {
      let u = this.user
      if (typeof u === 'string') {
        try {
          u = JSON.parse(u)
        } catch (e) {
          u = null
        }
      }
      if (u && (u.id || u.email)) {
        state.set('user', u, { skipStorage: true })
      }
    }
  }
  render() {
    if (this.isLoggedIn()) {
      return html`<md-button color="outlined" @click=${this.signOut}>Sign out</md-button>`
    } else {
      return html`<md-button color="outlined" href="/signin">Sign in</md-button>`
    }
  }
  isLoggedIn() {
    let user = this.user || state.get('user')
    if (typeof user === 'string') {
      try {
        user = JSON.parse(user)
      } catch (e) {
        user = null
      }
    }
    return !!(user && (user.id || user.email))
  }
  async signOut() {
    state.delete('user')
    await signOut()
    window.location.href = '/'
  }
}
customElements.define('sign-in-button', SignInButton)
