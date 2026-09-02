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
    // 货币口径与官方价快照（渠道定价节/市场页走查数据源）
    usd_exchange_rate: 7.2,
    price: 7.2,
    quota_display_type: 'CNY',
    custom_currency_symbol: '¥',
    custom_currency_exchange_rate: 7.2,
    official_pricing: [
      {
        model: 'deepseek-v4-flash',
        price: {
          input: 0.44,
          output: 1.32,
          cached_input: 0.02,
          cache_write: 0.44,
          source_preset: '官方倍率预设',
          verified_on: '2026-09-01',
        },
      },
      {
        model: 'glm-5.2',
        price: {
          input: 0.6,
          output: 2.0,
          cached_input: 0.08,
          cache_write: 0.6,
          source_preset: '官方倍率预设',
          verified_on: '2026-09-01',
        },
      },
    ],
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
  // Session restore on full page load: the web client (web/src/lib/auth-session.ts)
  // calls this on boot; without it every refresh drops the mock login session.
  // Must satisfy isAuthBundle: token fields + user + session (all present in MOCK_BUNDLE).
  if (req.method === 'POST' && url === '/api/user/auth/refresh') {
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
  // Dashboard overview: API keys list (features/keys/api.ts getApiKeys).
  // Matches GetApiKeysResponse: items[] + total counts; empty list renders
  // the "create first key" onboarding state instead of an error.
  if (req.method === 'GET' && url === '/api/token/') {
    return send(res, 200, {
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 1,
            user_id: 1,
            name: 'mock-key-1',
            created_time: now(),
            accessed_time: now(),
            status: 1,
            group: 'default',
            tags: '',
            used_quota: 0,
            remain_quota: 500000,
            unlimited_quota: true,
            models: '',
            subnet: '',
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
        // Shape mirrors new-api's paged response extras.
        start_timestamp: now() - 86400,
        end_timestamp: now(),
      },
    })
  }
  // Public pricing page (features/pricing/api.ts getPricing) — shares the same
  // seed models as the market mock (features/sharellm/mock/market.ts) so the
  // prototype shows data on /pricing without the admin-gated /market.
  if (req.method === 'GET' && url === '/api/pricing') {
    const pricingModel = (id, model_name, vendor_name, model_ratio, completion_ratio) => ({
      id,
      model_name,
      vendor_name,
      vendor_id: id,
      quota_type: 0,
      model_ratio,
      completion_ratio,
      cache_ratio: model_ratio * 0.1,
      create_cache_ratio: model_ratio,
      enable_groups: ['default'],
      tags: '',
      supported_endpoint_types: ['openai'],
    })
    return send(res, 200, {
      success: true,
      message: '',
      data: [
        pricingModel(1, 'deepseek-v4-flash', 'DeepSeek', 0.31, 1),
        pricingModel(2, 'deepseek-v4-pro', 'DeepSeek', 0.92, 3),
        pricingModel(3, 'glm-5.2', 'Zhipu', 0.3, 3.33),
        pricingModel(4, 'gpt-5.6-luna', 'OpenAI', 0.07, 6),
        pricingModel(5, 'gpt-5.6-sol', 'OpenAI', 0.165, 6.06),
        pricingModel(6, 'grok-4.5', 'xAI', 0.004, 0.3),
      ],
      vendors: [
        { id: 1, vendor_name: 'DeepSeek', description: '' },
        { id: 3, vendor_name: 'Zhipu', description: '' },
        { id: 4, vendor_name: 'OpenAI', description: '' },
        { id: 6, vendor_name: 'xAI', description: '' },
      ],
      group_ratio: { default: 1 },
      usable_group: { default: { desc: '默认分组', ratio: 1 } },
      supported_endpoint: { openai: 'OpenAI' },
      auto_groups: [],
    })
  }
  // Dashboard overview panels (features/dashboard/api.ts + performance-metrics/api.ts).
  // Usage trend sparkline: QuotaDataItem[] keyed by hour over the last 24h.
  if (req.method === 'GET' && (url === '/api/data/self' || url === '/api/data')) {
    const hours = 24
    const items = Array.from({ length: hours }, (_, i) => {
      const created_at = now() - (hours - 1 - i) * 3600
      const count = Math.floor(20 + 40 * Math.abs(Math.sin(i)))
      return {
        id: i + 1,
        user_id: 1,
        username: 'founder',
        model_name: 'deepseek-v4-flash',
        created_at,
        token_used: count * 1200,
        count,
        quota: count * 300,
      }
    })
    return send(res, 200, { success: true, message: '', data: items })
  }
  // Performance health panel: PerfModelSummary[] (avg_latency_ms in ms, success_rate 0-1).
  if (req.method === 'GET' && url === '/api/perf-metrics/summary') {
    return send(res, 200, {
      success: true,
      message: '',
      data: {
        models: [
          {
            model_name: 'deepseek-v4-flash',
            avg_latency_ms: 1920,
            success_rate: 1,
            avg_tps: 35.9,
            request_count: 128,
          },
          {
            model_name: 'glm-5.2',
            avg_latency_ms: 3520,
            success_rate: 0.998,
            avg_tps: 28.2,
            request_count: 96,
          },
          {
            model_name: 'gpt-5.6-luna',
            avg_latency_ms: 8000,
            success_rate: 1,
            avg_tps: 19.5,
            request_count: 42,
          },
        ],
      },
    })
  }
  // Uptime panel: UptimeGroupResult[] (uptime 0-1, status 0=down 1=up).
  if (req.method === 'GET' && url === '/api/uptime/status') {
    return send(res, 200, {
      success: true,
      message: '',
      data: [
        {
          categoryName: '上游渠道',
          monitors: [
            { name: 'DeepSeek 官方', uptime: 0.999, status: 1 },
            { name: 'SiliconFlow', uptime: 0.992, status: 1 },
            { name: 'sensenova', uptime: 0.998, status: 1 },
          ],
        },
        {
          categoryName: '平台服务',
          monitors: [
            { name: 'API 网关', uptime: 1, status: 1 },
            { name: '计费引擎', uptime: 0.997, status: 1 },
          ],
        },
      ],
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
