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
/**
 * Utility functions for redemption codes
 */

/**
 * Check if a Unix timestamp (in seconds) is expired
 * @param timestamp - Unix timestamp in seconds (0 means never expires)
 * @returns true if the timestamp is in the past
 */
export function isTimestampExpired(timestamp: number): boolean {
  if (timestamp === 0) return false
  return timestamp < Date.now() / 1000
}

/**
 * Check if redemption code is expired based on business logic
 * Only enabled redemption codes (status === 1) can be considered expired
 * @param expired_time - Unix timestamp in seconds (0 means never expires)
 * @param status - Redemption status (1: enabled, 2: disabled, 3: used)
 * @returns true if the code is expired
 */
export function isRedemptionExpired(
  expired_time: number,
  status: number
): boolean {
  return status === 1 && isTimestampExpired(expired_time)
}

/**
 * Local date stamp (YYYY-MM-DD) used in redemption export filenames.
 */
export function getDateStamp(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Trigger a browser download for plain-text content (one file, no auth needed
 * since the caller is responsible for fetching the content first).
 * @param filename - Suggested download filename
 * @param content - Text content of the file
 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
