import { Rend } from "rend"
import { layout } from "../views/layout.js"

export const globals = {}
let count = 0
export async function init(c) {
  if (count > 0) return
  const rend = new Rend({
    layout,
  })
  globals.rend = rend
  count++
}
