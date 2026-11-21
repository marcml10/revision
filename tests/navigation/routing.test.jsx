import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, renderApp } from '../support/render-app.jsx'

describe('Page routing', () => {
  it('opens on the home page', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: /Make today/ })).toBeInTheDocument()
    expect(dockButton('Home')).toHaveAttribute('aria-current', 'page')
  })

  it('routes to every page from the dock and keeps the active state in sync', async () => {
    const { user } = renderApp()

    const destinations = [
      ['Library', /Your library/],
      ['Calendar', /Your calendar/],
      ['Insights', /Your rhythm/],
      ['Settings', /Settings/],
      ['Home', /Make today/],
    ]

    for (const [label, heading] of destinations) {
      await user.click(dockButton(label))
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
      expect(dockButton(label)).toHaveAttribute('aria-current', 'page')
    }
  })

  it('jumps from home to the full library with "See all"', async () => {
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: /See all/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your library' })).toBeInTheDocument()
    expect(dockButton('Library')).toHaveAttribute('aria-current', 'page')
  })
})
