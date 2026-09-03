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
import { useQuery } from '@tanstack/react-query'
import { Sparkles, ShieldCheck, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassSurface, PastelBackdrop } from '@/components/ui/v2-surfaces'
import { isHttpUrl, isLikelyHtml } from '@/lib/content-format'

import { getAboutContent } from './api'

function EmptyAboutState() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <PublicLayout showMainContainer={false}>
      <PastelBackdrop />
      <div className='mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-8 sm:py-16'>
        <GlassSurface variant='shell' className='space-y-3 text-center'>
          <h1 className='text-balance text-3xl font-bold tracking-tight sm:text-4xl'>
            {t('aboutPage.hero.title')}
          </h1>
          <p className='text-pretty mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg'>
            {t('aboutPage.hero.subtitle')}
          </p>
        </GlassSurface>

        <GlassSurface variant='card' className='space-y-3'>
          <div className='flex items-center gap-2 text-primary'>
            <ShieldCheck className='size-5' />
            <h2 className='text-lg font-semibold'>{t('aboutPage.diff.title')}</h2>
          </div>
          <ol className='text-sm leading-relaxed text-muted-foreground space-y-2'>
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className='flex gap-2'>
                <span className='text-primary font-bold'>{i}.</span>
                <span>{t(`aboutPage.diff.item${i}`)}</span>
              </li>
            ))}
          </ol>
        </GlassSurface>

        <GlassSurface variant='card' className='space-y-3'>
          <div className='flex items-center gap-2 text-primary'>
            <Sparkles className='size-5' />
            <h2 className='text-lg font-semibold'>{t('aboutPage.terms.title')}</h2>
          </div>
          <ul className='text-sm leading-relaxed text-muted-foreground space-y-2'>
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className='flex gap-2'>
                <span className='text-primary'>•</span>
                <span>{t(`aboutPage.terms.item${i}`)}</span>
              </li>
            ))}
          </ul>
        </GlassSurface>

        <GlassSurface variant='card' className='space-y-2'>
          <div className='flex items-center gap-2 text-primary'>
            <Mail className='size-5' />
            <h2 className='text-lg font-semibold'>{t('aboutPage.contact.title')}</h2>
          </div>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {t('aboutPage.contact.lead')}{' '}
            <a
              href='mailto:support@llmcommons.com'
              className='text-primary font-medium hover:underline'
            >
              support@llmcommons.com
            </a>
          </p>
          <p className='text-sm text-muted-foreground'>
            {t('aboutPage.contact.status')}{' '}
            <a href='/status' className='text-primary font-medium hover:underline'>
              /status
            </a>
            {' · '}
            {t('aboutPage.contact.pricing')}{' '}
            <a href='/pricing' className='text-primary font-medium hover:underline'>
              /pricing
            </a>
          </p>
        </GlassSurface>

        <p className='text-center text-xs text-muted-foreground'>
          <a
            href='https://github.com/QuantumNous/new-api'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary hover:underline'
          >
            {t('NewAPI')}
          </a>{' '}
          © {currentYear}{' '}
          <a
            href='https://github.com/QuantumNous'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary hover:underline'
          >
            {t('QuantumNous')}
          </a>{' '}
          {t('| Based on')}{' '}
          <a
            href='https://github.com/songquanpeng/one-api'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary hover:underline'
          >
            {t('One API')}
          </a>{' '}
          © 2023{' '}
          <a
            href='https://github.com/songquanpeng'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary hover:underline'
          >
            {t('JustSong')}
          </a>
          .{' '}
          {t('This project must be used in compliance with the')}{' '}
          <a
            href='https://github.com/QuantumNous/new-api/blob/main/LICENSE'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-primary hover:underline'
          >
            {t('AGPL v3.0 License')}
          </a>
          .
        </p>
      </div>
    </PublicLayout>
  )
}

export function About() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['about-content'],
    queryFn: getAboutContent,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isHttpUrl(rawContent)
  const contentIsHtml = hasContent && isLikelyHtml(rawContent)

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent) {
    return (
      <PublicLayout>
        <EmptyAboutState />
      </PublicLayout>
    )
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        <iframe
          src={rawContent}
          className='h-[calc(100vh-3.5rem)] w-full border-0'
          title={t('About')}
          sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts'
        />
      </PublicLayout>
    )
  }

  if (contentIsHtml) {
    return (
      <PublicLayout showMainContainer={false}>
        <RichContent
          mode='html'
          htmlVariant='isolated'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        <RichContent
          mode='markdown'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </div>
    </PublicLayout>
  )
}
