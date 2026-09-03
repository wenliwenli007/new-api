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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { GlassSurface, PastelBackdrop } from '@/components/ui/v2-surfaces'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='relative grid h-svh max-w-none grid-cols-1 lg:grid-cols-2'>
      <PastelBackdrop />
      <Link
        to='/'
        className='absolute top-4 left-4 z-20 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
      >
        <div className='relative h-8 w-8'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <h1 className='text-xl font-medium'>{systemName}</h1>
        )}
      </Link>

      {/* Left brand panel — hidden on small screens */}
      <aside className='relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 -z-10 bg-radial-[at_18%_22%] from-primary/20 via-primary/5 to-transparent bg-radial-[at_82%_88%] from-chart-3/18 via-transparent to-transparent'
        />
        <div className='mt-auto max-w-md space-y-5'>
          <h2 className='text-balance text-3xl font-semibold tracking-tight'>
            {t(
              'One gateway to every model — transparent pricing, real-time routing.'
            )}
          </h2>
          <p className='text-pretty text-base text-muted-foreground'>
            {t(
              'Discover curated AI models, compare pricing and capabilities, and choose the right model for every scenario.'
            )}
          </p>
        </div>
      </aside>

      {/* Right form panel */}
      <div className='flex items-center justify-center px-4 py-16 sm:px-8'>
        <GlassSurface
          variant='shell'
          className='mx-auto w-full max-w-[480px] space-y-8 p-6 sm:p-8'
        >
          {children}
        </GlassSurface>
      </div>
    </div>
  )
}
