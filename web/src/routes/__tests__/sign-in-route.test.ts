import { beforeEach, describe, expect, test, vi } from 'vitest'

const bootstrapAuthentication = vi.fn()
const authState = { auth: { user: null, accessToken: null } }

vi.mock('@/lib/auth-session', () => ({
  bootstrapAuthentication,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}))

vi.mock('@/features/auth/lib/auth-redirect', () => ({
  sanitizeAuthRedirect: vi.fn(() => null),
}))

vi.mock('@/features/auth/sign-in', () => ({
  SignIn: () => null,
}))

describe('sign-in route initialization', () => {
  beforeEach(() => {
    bootstrapAuthentication.mockReset()
    authState.auth.user = null
    authState.auth.accessToken = null
  })

  test('waits for authentication bootstrap before rendering the sign-in page', async () => {
    let releaseBootstrap: (() => void) | undefined
    bootstrapAuthentication.mockReturnValue(
      new Promise((resolve) => {
        releaseBootstrap = () => resolve({ kind: 'anonymous' })
      })
    )

    const { Route } = await import('../(auth)/sign-in')
    const beforeLoad = Route.options.beforeLoad
    const navigation = beforeLoad?.({ search: {} } as never)

    expect(navigation).toBeInstanceOf(Promise)
    releaseBootstrap?.()
    await navigation
    expect(bootstrapAuthentication).toHaveBeenCalledTimes(1)
  })
})
