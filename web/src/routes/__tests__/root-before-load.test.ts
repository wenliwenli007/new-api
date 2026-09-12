import { beforeEach, describe, expect, test, vi } from 'vitest'

const bootstrapAuthentication = vi.fn()
const getSetupStatus = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}))

vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => null,
  createRootRouteWithContext: () => (options: unknown) => ({ options }),
  redirect: vi.fn(),
  useNavigate: vi.fn(),
}))

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtools: () => null,
}))

vi.mock('@/components/navigation-progress', () => ({
  NavigationProgress: () => null,
}))

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}))

vi.mock('@/context/theme-customization-provider', () => ({
  ThemeCustomizationProvider: ({ children }: { children: unknown }) => children,
}))

vi.mock('@/features/auth/lib/storage', () => ({
  saveAffiliateCode: vi.fn(),
}))

vi.mock('@/features/errors/general-error', () => ({
  GeneralError: () => null,
}))

vi.mock('@/features/errors/not-found-error', () => ({
  NotFoundError: () => null,
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: vi.fn(),
}))

vi.mock('@/lib/auth-session', () => ({
  bootstrapAuthentication,
  clearAuthenticatedClientState: vi.fn(),
  clearAuthentication: vi.fn(),
}))

vi.mock('@/lib/auth-session-sync', () => ({
  subscribeAuthSessionEvents: vi.fn(),
}))

vi.mock('@/lib/legacy-route', () => ({
  resolveLegacyRoute: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { subscribe: vi.fn() },
}))

vi.mock('@/features/setup/api', () => ({
  getSetupStatus,
}))

describe('root route initialization', () => {
  beforeEach(() => {
    bootstrapAuthentication.mockReset()
    getSetupStatus.mockReset()
    getSetupStatus.mockResolvedValue({
      success: true,
      data: { status: true },
    })
  })

  test('does not block public navigation on anonymous auth refresh', async () => {
    let releaseBootstrap: (() => void) | undefined
    bootstrapAuthentication.mockReturnValue(
      new Promise((resolve) => {
        releaseBootstrap = () => resolve({ kind: 'anonymous' })
      })
    )

    const { Route } = await import('../__root')
    const beforeLoad = Route.options.beforeLoad
    const navigation = beforeLoad?.({
      location: {
        href: 'http://localhost/',
        pathname: '/',
      },
    } as never)

    await navigation

    expect(bootstrapAuthentication).toHaveBeenCalledTimes(1)
    releaseBootstrap?.()
  })

  test('does not start authentication refresh for setup navigation', async () => {
    const { Route } = await import('../__root')
    const beforeLoad = Route.options.beforeLoad
    await beforeLoad?.({
      location: {
        href: 'http://localhost/setup',
        pathname: '/setup',
      },
    } as never)

    expect(bootstrapAuthentication).not.toHaveBeenCalled()
  })
})
