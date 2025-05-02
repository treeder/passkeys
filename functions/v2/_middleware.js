
export async function onRequest(c) {
  try {
    return await c.next()
  } catch (e) {
    console.log("error:", e)
    return Response.json({ error: { message: e.message } }, { status: e.status || 500 })
  }
}