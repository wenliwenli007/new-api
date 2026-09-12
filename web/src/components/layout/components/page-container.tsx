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
import { cn } from '@/lib/utils'

export type PageContainerWidth = 'default' | 'wide'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: PageContainerWidth
}

/** Shared responsive content boundary for public pages. */
export function PageContainer({
  className,
  width = 'default',
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        width === 'default' ? 'max-w-container' : 'max-w-container-lg',
        className
      )}
      {...props}
    />
  )
}

interface PageShellProps extends React.HTMLAttributes<HTMLElement> {
  contained?: boolean
  width?: PageContainerWidth
  withHeaderOffset?: boolean
}

/** Shared page shell that keeps the public header from cutting into content. */
export function PageShell({
  children,
  className,
  contained = true,
  width = 'default',
  withHeaderOffset = true,
  ...props
}: PageShellProps) {
  return (
    <main
      className={cn(
        'w-full pb-6 sm:pb-8',
        // 头部已改为 sticky 独立占位（不再 fixed 悬浮），主内容无需再做高度补偿；
        // withHeaderOffset 只控制内容自身的顶部节奏。
        withHeaderOffset ? 'pt-4' : 'pt-6 sm:pt-8',
        className
      )}
      {...props}
    >
      {contained ? (
        <PageContainer width={width}>{children}</PageContainer>
      ) : (
        children
      )}
    </main>
  )
}
