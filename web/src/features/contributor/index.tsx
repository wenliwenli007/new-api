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
import {
  Activity,
  ClipboardList,
  Coins,
  Handshake,
  HelpCircle,
  ListChecks,
  Mail,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'

const APPLY_EMAIL = '1064292430@qq.com'

const TAGS = [
  'contributorPage.tags.official',
  'contributorPage.tags.encrypted',
  'contributorPage.tags.metered',
  'contributorPage.tags.monthly',
] as const

const REVENUE_ROWS = [
  { label: 'contributorPage.revenue.ratio.label', value: 'contributorPage.revenue.ratio.value' },
  { label: 'contributorPage.revenue.cycle.label', value: 'contributorPage.revenue.cycle.value' },
  { label: 'contributorPage.revenue.withdraw.label', value: 'contributorPage.revenue.withdraw.value' },
  { label: 'contributorPage.revenue.pricing.label', value: 'contributorPage.revenue.pricing.value' },
] as const

const REQUIREMENTS = [
  { icon: ShieldCheck, text: 'contributorPage.requirements.source' },
  { icon: ShieldCheck, text: 'contributorPage.requirements.noReverse' },
  { icon: Activity, text: 'contributorPage.requirements.availability' },
  { icon: ClipboardList, text: 'contributorPage.requirements.legal' },
] as const

const STEPS = [
  { icon: Mail, title: 'contributorPage.steps.one.title', desc: 'contributorPage.steps.one.desc' },
  { icon: ShieldCheck, title: 'contributorPage.steps.two.title', desc: 'contributorPage.steps.two.desc' },
  { icon: Rocket, title: 'contributorPage.steps.three.title', desc: 'contributorPage.steps.three.desc' },
] as const

const FAQ_ITEMS = [
  'contributorPage.faq.q1',
  'contributorPage.faq.q2',
  'contributorPage.faq.q3',
] as const

function SectionHeading(props: {
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
  const Icon = props.icon
  return (
    <div className='flex items-center gap-2'>
      <Icon className='text-primary size-5' />
      <h2 className='text-xl font-semibold tracking-tight'>
        {props.title}
      </h2>
    </div>
  )
}

export function ContributorProgram() {
  const { t } = useTranslation()

  const applyMailto = `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(
    t('contributorPage.apply.subject')
  )}`

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl space-y-10 py-8'>
        {/* Hero */}
        <div className='space-y-4 text-center'>
          <div className='flex justify-center'>
            <div className='bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl'>
              <Handshake className='size-7' />
            </div>
          </div>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            {t('contributorPage.title')}
          </h1>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            {t('contributorPage.subtitle')}
          </p>
          <div className='flex items-baseline justify-center gap-2'>
            <span className='text-primary text-4xl font-bold'>92%</span>
            <span className='text-muted-foreground text-sm'>
              {t('contributorPage.youEarn')}
            </span>
          </div>
        </div>

        {/* Highlights */}
        <Card>
          <CardContent className='space-y-3'>
            <div className='flex flex-wrap gap-2'>
              {TAGS.map((tag) => (
                <Badge key={tag} variant='secondary'>
                  {t(tag)}
                </Badge>
              ))}
            </div>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t('contributorPage.intro')}
            </p>
          </CardContent>
        </Card>

        {/* Revenue model */}
        <section className='space-y-4'>
          <SectionHeading icon={Coins} title={t('contributorPage.revenue.title')} />
          <Card>
            <CardContent className='px-0'>
              <Table>
                <TableBody>
                  {REVENUE_ROWS.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className='w-32 align-top font-medium'>
                        {t(row.label)}
                      </TableCell>
                      <TableCell className='text-muted-foreground leading-relaxed'>
                        {t(row.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Requirements */}
        <section className='space-y-4'>
          <SectionHeading
            icon={ListChecks}
            title={t('contributorPage.requirements.title')}
          />
          <Card>
            <CardContent className='space-y-4'>
              {REQUIREMENTS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.text} className='flex gap-3'>
                    <Icon className='text-muted-foreground mt-0.5 size-4 shrink-0' />
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                      {t(item.text)}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        {/* Application steps */}
        <section className='space-y-4'>
          <SectionHeading icon={ClipboardList} title={t('contributorPage.steps.title')} />
          <div className='grid gap-4 md:grid-cols-3'>
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={step.title}>
                  <CardHeader>
                    <div className='flex items-center justify-between'>
                      <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
                        <Icon className='size-4.5' />
                      </div>
                      <span className='text-muted-foreground/40 text-2xl font-bold'>
                        {index + 1}
                      </span>
                    </div>
                    <CardTitle className='text-base'>{t(step.title)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className='leading-relaxed'>
                      {t(step.desc)}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Apply CTA */}
        <Card className='border-primary/30 bg-primary/5'>
          <CardContent className='flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left'>
            <div className='space-y-1'>
              <p className='font-semibold'>{t('contributorPage.apply.title')}</p>
              <p className='text-muted-foreground text-sm'>
                {t('contributorPage.apply.desc', { email: APPLY_EMAIL })}
              </p>
            </div>
            <Button render={<a href={applyMailto} />}>
              <Mail className='size-4' />
              {t('contributorPage.apply.button')}
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section className='space-y-4'>
          <SectionHeading icon={HelpCircle} title={t('contributorPage.faq.title')} />
          <div className='space-y-4'>
            {FAQ_ITEMS.map((q) => (
              <Card key={q}>
                <CardHeader>
                  <CardTitle className='text-base'>{t(q)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t(`${q.replace('.q', '.a')}`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cross links */}
        <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm'>
          <Link to='/' className='text-primary hover:underline'>
            {t('contributorPage.links.back')}
          </Link>
          <span aria-hidden='true'>·</span>
          <Link to='/market' className='text-primary hover:underline'>
            {t('contributorPage.links.market')}
          </Link>
          <span aria-hidden='true'>·</span>
          <Link to='/health' className='text-primary hover:underline'>
            {t('contributorPage.links.health')}
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
