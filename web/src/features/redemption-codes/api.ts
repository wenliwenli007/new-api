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
import { api, getFreshAuthHeaders } from '@/lib/api'

import { downloadTextFile, getDateStamp } from './lib'
import type {
  Redemption,
  ApiResponse,
  GetRedemptionsParams,
  GetRedemptionsResponse,
  SearchRedemptionsParams,
  RedemptionFormData,
} from './types'

// ============================================================================
// Redemption Code Management
// ============================================================================

// Get paginated redemption codes list
export async function getRedemptions(
  params: GetRedemptionsParams = {}
): Promise<GetRedemptionsResponse> {
  const { p = 1, page_size = 10 } = params
  const res = await api.get(`/api/redemption/?p=${p}&page_size=${page_size}`)
  return res.data
}

// Search redemption codes by keyword
export async function searchRedemptions(
  params: SearchRedemptionsParams
): Promise<GetRedemptionsResponse> {
  const { keyword = '', status = '', p = 1, page_size = 10 } = params
  const queryParams = new URLSearchParams()
  queryParams.set('keyword', keyword)
  if (status) queryParams.set('status', status)
  queryParams.set('p', String(p))
  queryParams.set('page_size', String(page_size))
  const res = await api.get(`/api/redemption/search?${queryParams.toString()}`)
  return res.data
}

// Get single redemption code by ID
export async function getRedemption(
  id: number
): Promise<ApiResponse<Redemption>> {
  const res = await api.get(`/api/redemption/${id}`)
  return res.data
}

// Create redemption code(s)
export async function createRedemption(
  data: RedemptionFormData
): Promise<ApiResponse<string[]>> {
  const res = await api.post('/api/redemption/', data)
  return res.data
}

// Update redemption code
export async function updateRedemption(
  data: RedemptionFormData & { id: number }
): Promise<ApiResponse<Redemption>> {
  const res = await api.put('/api/redemption/', data)
  return res.data
}

// Update redemption code status (enable/disable)
export async function updateRedemptionStatus(
  id: number,
  status: number
): Promise<ApiResponse<Redemption>> {
  const res = await api.put('/api/redemption/?status_only=true', { id, status })
  return res.data
}

// Delete a single redemption code
export async function deleteRedemption(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/redemption/${id}/`)
  return res.data
}

// Delete invalid redemption codes (used, disabled, expired)
export async function deleteInvalidRedemptions(): Promise<ApiResponse<number>> {
  const res = await api.delete('/api/redemption/invalid')
  return res.data
}

// ============================================================================
// Redemption Code TXT Export
// ============================================================================

export interface ExportRedemptionsResult {
  success: boolean
  message?: string
  count: number
}

/**
 * Export redemption codes as a TXT file (one code per line) via the admin
 * export API. Defaults to all unused codes when no status is given.
 *
 * Uses fetch with the Authorization header and saves the response as a blob —
 * the admin API requires an auth header, so window.open cannot be used.
 */
export async function exportRedemptionsTxt(
  status?: string
): Promise<ExportRedemptionsResult> {
  try {
    const queryParams = new URLSearchParams()
    if (status) queryParams.set('status', status)
    const query = queryParams.toString()
    const headers = await getFreshAuthHeaders()
    const res = await fetch(
      `/api/redemption/export${query ? `?${query}` : ''}`,
      { headers }
    )
    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}`,
        count: 0,
      }
    }
    const blob = await res.blob()
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      // Backend errors are JSON envelopes (HTTP 200 + success=false)
      let message = ''
      try {
        const payload = JSON.parse(await blob.text())
        message = payload?.message || ''
      } catch {
        // ignore JSON parse errors, fall back to generic message
      }
      return { success: false, message, count: 0 }
    }
    const text = await blob.text()
    const exportedCount = text
      .split('\n')
      .filter((line) => line.trim() !== '').length
    downloadTextFile(`redemption-${getDateStamp()}.txt`, text)
    return { success: true, count: exportedCount }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : undefined,
      count: 0,
    }
  }
}
