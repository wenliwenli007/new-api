/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

// Mock API server for the ShareLLM prototype staging (no Go backend needed).
// Serves the endpoints the new-api web UI calls while browsing with mock data.
// Usage: node mock-api.mjs   (listens on 127.0.0.1:3000 — the rsbuild proxy target)
import http from 'node:http'

const now = () => Math.floor(Date.now() / 1000)
const expiresAt = Date.now() + 24 * 3600 * 1000

const MOCK_USER = {
  id: 1,
  username: 'founder',
  display_name: '创始人（mock）',
  email: 'founder@example.com',
  role: 100,
  status: 1,
  group: 'default',
  quota: 500000,
  used_quota: 0,
  request_count: 0,
}

const MOCK_SESSION = {
  sid: 'mock-session-0001',
  current: true,
  login_method: 'password',
  ip: '127.0.0.1',
  user_agent: 'mock-api',
  created_at: now(),
  last_active_at: now(),
  expires_at: Math.floor(expiresAt / 1000),
}

const MOCK_BUNDLE = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  access_expires_at: expiresAt,
  user: MOCK_USER,
  session: MOCK_SESSION,
}

const STATUS = {
  success: true,
  message: '',
  data: {
    version: 'sharellm-prototype-mock',
    start_time: now(),
    system_name: 'LLM 共有',
    logo: '/logo.png',
    footer_html: '',
    email_verification: false,
    turnstile_check: false,
    github_oauth: false,
    wechat_login: false,
    telegram_oauth: false,
    linuxdo_oauth: false,
    discord_oauth: false,
    oidc_enabled: false,
    custom_oauth_providers: [],
    password_encryption_enabled: false,
    PasswordEncryptionEnabled: false,
    quota_per_unit: 500000,
    display_in_currency: true,
    enable_drawing: false,
    enable_task: false,
    enable_data_export: true,
    chats: [],
    HeaderNavModules: {
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: false,
      about: true,
      contributor: true,
      market: true,
      health: true,
    },
  },
}

function send(res, code, body) {
  const payload = JSON.stringify(body)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

const server = http.createServer((req, res) => {
  const url = (req.url ?? '').split('?')[0]

  if (req.method === 'GET' && url === '/api/status') {
    return send(res, 200, STATUS)
  }
  if (req.method === 'POST' && url === '/api/user/login') {
    return send(res, 200, {
      success: true,
      message: '',
      data: MOCK_BUNDLE,
    })
  }
  if (req.method === 'GET' && url === '/api/user/self') {
    return send(res, 200, { success: true, message: '', data: MOCK_USER })
  }
  if (req.method === 'GET' && url === '/api/notice') {
    return send(res, 200, { success: true, message: '', data: '' })
  }
  if (req.method === 'GET' && url === '/api/user/models') {
    return send(res, 200, {
      success: true,
      data: ['deepseek-v4-flash', 'deepseek-v4-pro', 'gpt-5.6-luna', 'gpt-5.4-mini', 'grok-4.5'],
    })
  }
  if (req.method === 'GET' && url === '/api/user/self/groups') {
    return send(res, 200, {
      success: true,
      data: { default: { desc: '默认分组', ratio: 1 } },
    })
  }
  if (req.method === 'GET' && url === '/api/user/2fa/status') {
    return send(res, 200, { success: true, data: { enabled: false } })
  }
  if (url.startsWith('/api/')) {
    // Generic mock: pages relying on sharellmApi use USE_MOCK client-side and
    // never reach here; this catch-all keeps stray admin calls non-fatal.
    return send(res, 200, { success: false, message: 'mock-api: not implemented' })
  }
  return send(res, 404, { success: false, message: 'not found' })
})

server.listen(3000, '127.0.0.1', () => {
  console.log('mock-api listening on http://127.0.0.1:3000')
})
