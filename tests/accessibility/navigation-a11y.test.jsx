import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openTopic, renderApp, renderWithBooks } from '../support/render-app.jsx'

describe('Navigation accessibility', () => {
  it('exposes the dock as a labelled navigation landmark with named controls', () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(nav).toBeInTheDocument()
    for (const label of ['Home', 'Library', 'Calendar', 'Insights', 'Settings']) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('supports keyboard activation of dock destinations', async () => {
    const { user } = renderApp()
    const calendar = dockButton('Calendar')
    calendar.focus()
    expect(calendar).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument()
    expect(dockButton('Calendar')).toHaveAttribute('aria-current', 'page')
  })

  it('keeps primary navigation reachable but inert inside a topic', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')

    const nav = dockButton('Library').closest('nav')
    expect(nav).toHaveAttribute('inert')
    expect(nav).toHaveAttribute('aria-label', 'Primary navigation')
  })

  it('marks the active destination for assistive technology', async () => {
    const { user } = renderApp()
    await user.click(dockButton('Insights'))

    expect(dockButton('Insights')).toHaveAttribute('aria-current', 'page')
    expect(dockButton('Home')).not.toHaveAttribute('aria-current')
    expect(mainRegion().getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
