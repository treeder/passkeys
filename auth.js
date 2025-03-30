
export async function auth(c, next) {
  if (c.req.header('Authorization')) {
    let az = c.req.header('Authorization')
    // console.log("AUTHORIZATION HEADER", az)
    // console.log("COOKIE TOO?", getCookie(c, 'session'))

    let parts = az.split(' ')
    if (parts.length != 2) {
      throw new APIError("Authorization header is not in the correct format", { status: 400 })
    }
    let type = parts[0]
    let token = parts[1]

    // I THINK API KEY SHOULD BE JUST FOR A PARTICULAR USER... MAYBE?  OR NO.. Actually no, for flycart, only flycart for instance
    if (type == 'ApiKey') {
      let apiKey = await globals.d1.prepare(`SELECT * FROM apiKeys WHERE key = ?`).bind(token).first()
      if (!apiKey) {
        throw new APIError("API key not found", { status: 401 })
      }
      if (apiKey.userID) {
        let user = await globals.d1.prepare(`SELECT * FROM users WHERE id = ?`).bind(apiKey.userID).first()
        if (!user) {
          throw new APIError("User not found", { status: 401 })
        }
        c.req.user = user
        c.req.userID = user.id
      } else {
        let org = await globals.d1.prepare(`SELECT * FROM orgs WHERE id = ?`).bind(apiKey.orgID).first()
        if (!org) {
          throw new APIError("Org not found", { status: 401 })
        }
        c.req.org = org
        c.req.orgID = org.id
      }
    } else if (type == 'Cookie') {
      return await setupUserSession(c, token)
    }
  } else {
    let sessionID = getCookie(c, 'session')
    return await setupUserSession(c, sessionID)
  }
  await next()
}

async function setupUserSession(c, sessionID) {
  // Fetch any session data or user information you want here and attach it to the request object so you can use it in your routes
  // c.req.userID = user.id
  c.req.sessionID
}


export function hostname(req) {
  let domain = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (domain) {
    domain = domain.split(':')[0]
    domain = domain.split(':')[0] // remove port
  }
  return domain
}

export function hostURL(req) {
  let domain = hostname(req)
  domain = 'https://' + domain
  // console.log('config domain', domain)
  return domain
}

export function getUserByEmail(email) {
  return {
    id: email,
    email: email,
  }
}