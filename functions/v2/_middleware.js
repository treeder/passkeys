export async function onRequest(c) {
  try {
    return await c.next()
  } catch (e) {
    if (e.status && e.status >= 500) {
      console.log('error:', e)
    }
    return Response.json({ error: { message: e.message } }, { status: e.status || 500 })
  }
}
