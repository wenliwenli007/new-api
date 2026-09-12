import { beforeEach, describe, expect, test, vi } from 'vitest'

const bootstrapAuthentication = vi.fn()

vi.mock('@/lib/auth-session', () => ({
  bootstrapAuthentication,
}))

vi.mock('@/components/layout', () => ({
  AuthenticatedLayout: () => null,
}))

describe('authenticated route initialization', () => {
  beforeEach(() => {
    bootstrapAuthentication.mockReset()
  })

  test('waits for authentication bootstrap before evaluating access', async () => {
    let releaseBootstrap: (() => void) | undefined
    bootstrapAuthentication.mockReturnValue(
      new Promise((resolve) => {
        releaseBootstrap = () => resolve({ kind: 'anonymous' })
      })
    )

    const { Route } = await import('../_authenticated/route')
    const beforeLoad = Route.options.beforeLoad
    const navigation = beforeLoad?.({
      location: {
        href: 'http://localhost/dashboard',
        pathname: '/dashboard',
        search: {},
        searchStr: '',
        hash: '',
      },
    } as never)

    let settled = false
    void navigation?.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      }
    )
    expect(settled).toBe(false)

    releaseBootstrap?.()
    await navigation?.catch(() => undefined)
    expect(bootstrapAuthentication).toHaveBeenCalledTimes(1)
  })

  test('preserves the private route query and hash in the sign-in redirect', async () => {
    bootstrapAuthentication.mockResolvedValue({ kind: 'anonymous' })

    const { Route } = await import('../_authenticated/route')
    const beforeLoad = Route.options.beforeLoad
    const navigation = beforeLoad?.({
      location: {
        href: 'http://localhost/dashboard?tab=logs#section',
        pathname: '/dashboard',
        search: { tab: 'logs' },
        searchStr: '?tab=logs',
        hash: 'section',
      },
    } as never)

    const redirect = await navigation?.catch((error: unknown) => error)
    expect(redirect?.options?.search?.redirect).toBe(
      '/dashboard?tab=logs#section'
    )
  })
})
