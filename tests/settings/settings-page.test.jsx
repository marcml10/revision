import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { appShell, renderApp } from '../support/render-app.jsx'
import { openSettings } from '../support/navigation.js'

const goalGroup = () => screen.getByRole('group', { name: 'Weekly review goal' })
const goal = (value) => within(goalGroup()).getByRole('button', { name: new RegExp(`^${value}`) })

describe('Settings page', () => {
  it('shows the weekly goal choices with the default selected', async () => {
    const { user } = renderApp()
    await openSettings(user)

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(within(goalGroup()).getAllByRole('button')).toHaveLength(3)
    expect(goal(5)).toHaveAttribute('aria-pressed', 'true')
    expect(goal(3)).toHaveAttribute('aria-pressed', 'false')
    expect(goal(7)).toHaveAttribute('aria-pressed', 'false')
  })

  it('changes the weekly goal', async () => {
    const { user } = renderApp()
    await openSettings(user)

    await user.click(goal(7))
    expect(goal(7)).toHaveAttribute('aria-pressed', 'true')
    expect(goal(5)).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies focus-mode toggles to the app shell', async () => {
    const { user } = renderApp()
    await openSettings(user)

    const compact = screen.getByRole('checkbox', { name: /Compact layout/ })
    const motion = screen.getByRole('checkbox', { name: /Reduce motion/ })

    expect(appShell()).not.toHaveClass('compact-mode')
    await user.click(compact)
    expect(compact).toBeChecked()
    expect(appShell()).toHaveClass('compact-mode')

    await user.click(motion)
    expect(motion).toBeChecked()
    expect(appShell()).toHaveClass('reduced-motion')

    await user.click(compact)
    expect(appShell()).not.toHaveClass('compact-mode')
  })

  it('resets preferences to defaults after confirmation', async () => {
    const { user } = renderApp()
    await openSettings(user)

    await user.click(goal(7))
    await user.click(screen.getByRole('checkbox', { name: /Compact layout/ }))
    await user.click(screen.getByRole('button', { name: /Reset/ }))

    expect(window.confirm).toHaveBeenCalledWith('Reset all settings to their defaults?')
    expect(goal(5)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('checkbox', { name: /Compact layout/ })).not.toBeChecked()
  })

  it('keeps preferences when reset is cancelled', async () => {
    const { user } = renderApp({ confirm: false })
    await openSettings(user)

    await user.click(goal(3))
    await user.click(screen.getByRole('button', { name: /Reset/ }))

    expect(goal(3)).toHaveAttribute('aria-pressed', 'true')
  })

  it('persists settings across an app restart', async () => {
    const first = renderApp()
    await openSettings(first.user)
    await first.user.click(goal(7))
    await first.user.click(screen.getByRole('checkbox', { name: /Reduce motion/ }))
    first.unmount()

    const second = renderApp({ seed: false })
    await openSettings(second.user)
    expect(goal(7)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('checkbox', { name: /Reduce motion/ })).toBeChecked()
    expect(appShell()).toHaveClass('reduced-motion')
  })
})
