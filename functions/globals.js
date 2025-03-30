import { Rend } from "rend"
import { layout } from "../views/layout.js"
import { ConsoleMailer } from "./mailer.js"

export const globals = {}

let count = 0
export async function init(c) {
  if (count > 0) return
  const rend = new Rend({
    layout,
  })
  globals.rend = rend
  globals.resend = JSON.parse(c.env.RESEND)
  globals.mailer = new ConsoleMailer()
  count++
}
