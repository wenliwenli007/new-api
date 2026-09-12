import { beforeEach, describe, expect, test, vi } from 'vitest'

const bootstrapAuthentication = vi.fn()
const getFreshModuleAccess = vi.fn()
const authState = { auth: { user: null } }

vi.mock('@/lib/auth-session', () => ({
  bootstrapAuthentication,
}))

vi.mock('@/lib/nav-modules', () => ({
  getFreshModuleAccess,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}))

vi.mock('@/features/pricing', () => ({
  Pricing: () => null,
}))

vi.mock('@/features/rankings', () => ({
  Rankings: () => null,
}))

async function assertAuthRequiredRouteWaits(
  routePath: '../pricing/index' | '../rankings/index'
) {
  let releaseBootstrap: (() => void) | undefined
  bootstrapAuthentication.mockReturnValue(
    new Promise((resolve) => {
      releaseBootstrap = () => resolve({ kind: 'anonymous' })
    })
  )
  getFreshModuleAccess.mockReturnValue({ enabled: true, requireAuth: true })

  const { Route } = await import(routePath)
  const navigation = Route.options.beforeLoad?.({
    location: {
      href: `http://localhost/${routePath.includes('pricing') ? 'pricing' : 'rankings'}`,
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
  await Promise.resolve()
  expect(bootstrapAuthentication).toHaveBeenCalledTimes(1)
  expect(settled).toBe(false)

  releaseBootstrap?.()
  await navigation?.catch(() => undefined)
}

describe('auth-required public modules', () => {
  beforeEach(() => {
    bootstrapAuthentication.mockReset()
    getFreshModuleAccess.mockReset()
    authState.auth.user = null
  })

  test('pricing waits for authentication before redirecting', async () => {
    await assertAuthRequiredRouteWaits('../pricing/index')
  })

  test('rankings waits for authentication before redirecting', async () => {
    await assertAuthRequiredRouteWaits('../rankings/index')
  })
})
