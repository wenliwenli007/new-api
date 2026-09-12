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

export function getPageCount(total: number, pageSize: number): number {
  if (total <= 0) return 1
  return Math.ceil(total / pageSize)
}

export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(1, page), Math.max(1, pageCount))
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const safePage = clampPage(page, getPageCount(items.length, pageSize))
  return items.slice((safePage - 1) * pageSize, safePage * pageSize)
}
