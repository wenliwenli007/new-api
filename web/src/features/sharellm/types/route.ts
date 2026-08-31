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

// ShareLLM consumer route domain types (route center / my routes).
export interface ConsumerRouteItem {
  id: number
  listingId: number
  offerId: number
  model: string
  contributor: string
  priority: number
  weight: number
}

export interface ConsumerRoute {
  id: number
  name: string
  status: 'active' | 'paused'
  failover: boolean
  tokenId?: number
  tokenKeyMask?: string
  items: ConsumerRouteItem[]
  lastCallAt?: string
  createdAt: string
}

export interface AddRouteInput {
  name: string
  model: string
  offerId: number
  priority: number
  failover: boolean
}
