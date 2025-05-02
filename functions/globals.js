import { Rend } from "rend"
import { layout } from "./layout.js"
import { ConsoleMailer } from "./mailer.js"

export const globals = {}

let count = 0
export async function init(c) {
  if (count > 0) return
  count++
  const rend = new Rend({ layout })
  globals.rend = rend
  globals.resend = JSON.parse(c.env.RESEND)
  // globals.mailer = new ConsoleMailer()
}
