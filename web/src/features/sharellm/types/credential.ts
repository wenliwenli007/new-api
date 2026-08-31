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

// Contributor credential domain types. The raw key never crosses the API:
// only ciphertext (server-side) and a masked view (client-side) exist.
export type CredentialProviderType = 'api_key' | 'codex' | 'gemini' | 'grok'
export type CredentialStatus = 'active' | 'paused' | 'revoked'

export interface CredentialModelScope {
  id: number
  model: string
  enabled: boolean
}

export interface CredentialView {
  id: number
  name: string
  providerType: CredentialProviderType
  providerName: string
  keyMask: string
  status: CredentialStatus
  models: string[]
  successRate?: string
  latency?: string
  cacheHitRate?: string
  lastCallAt?: string
  createdAt: string
}

export interface ProbeResult {
  credentialId: number
  successRate: string
  latency: string
  cacheHitRate: string
  verified: boolean
  probedAt: string
}
