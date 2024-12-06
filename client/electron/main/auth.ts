import axios from 'axios'
import { session } from 'electron'
import pkg from '../../package.json'

export async function login(serverUrl: string, username: string, password: string) {
  try {
    const response = await axios.post(`${serverUrl}/timebox/api/auth/login`, {
      username,
      password
    }, {
      withCredentials: true,
      headers: {
        'X-Client-Version': pkg.version
      }
    })

    const cookies = response.headers['set-cookie']
    
    if (cookies) {
      const urlObj = new URL(serverUrl)
      for (const cookieStr of cookies) {
        const cookie = parseCookie(cookieStr)
        await session.defaultSession.cookies.set({
          ...cookie,
          url: serverUrl,
          domain: urlObj.hostname
        })
      }
    }

    return response.data
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

function parseCookie(cookieStr: string): Electron.Cookie {
  const parts = cookieStr.split(';').map(p => p.trim())
  const firstEqual = parts[0].indexOf('=')
  const name = parts[0].slice(0, firstEqual)
  const value = parts[0].slice(firstEqual + 1)
  
  const cookie: Electron.Cookie = {
    name,
    value,
    sameSite: 'lax'
  }

  parts.slice(1).forEach(attr => {
    const [key, ...valParts] = attr.split('=').map(s => s.trim().toLowerCase())
    const val = valParts.join('=')
    switch(key) {
      case 'domain':
        cookie.domain = val
        break
      case 'path':
        cookie.path = val
        break
      case 'expires':
        cookie.expirationDate = new Date(val).getTime() / 1000
        cookie.session = false
        break
      case 'secure':
        cookie.secure = true
        break
      case 'httponly':
        cookie.httpOnly = true
        break
      case 'max-age':
        const maxAgeSeconds = parseInt(val)
        cookie.expirationDate = Math.floor(Date.now() / 1000 + maxAgeSeconds)
        cookie.session = false
        break
    }
  })

  if (!cookie.domain) {
    cookie.hostOnly = true
  }

  return cookie
}
