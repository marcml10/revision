import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Dock from '../../src/components/Dock.jsx'

const renderDock = (props = {}) => {
  const onNavigate = vi.fn()
  render(<Dock active="home" onNavigate={onNavigate} {...props} />)
  return { onNavigate, nav: screen.getByRole('navigation', { name: 'Primary navigation' }) }
}

describe('Dock navigation', () => {
  it('renders all five destinations with accessible names', () => {
    const { nav } = renderDock()
    const labels = ['Home', 'Library', 'Calendar', 'Insights', 'Settings']
    labels.forEach((label) => {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument()
    })
    expect(within(nav).getAllByRole('button')).toHaveLength(5)
  })

  it('marks the active destination with aria-current and the active class', () => {
    renderDock({ active: 'calendar' })
    const active = screen.getByRole('button', { name: 'Calendar' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('calls onNavigate with the destination id', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderDock()

    for (const [label, id] of [['Library', 'library'], ['Calendar', 'calendar'], ['Insights', 'insights'], ['Settings', 'settings'], ['Home', 'home']]) {
      await user.click(screen.getByRole('button', { name: label }))
      expect(onNavigate).toHaveBeenLastCalledWith(id)
    }
    expect(onNavigate).toHaveBeenCalledTimes(5)
  })

  it('hides itself from interaction when hidden', () => {
    const { nav } = renderDock({ hidden: true })
    expect(nav).toHaveClass('dock-hidden')
    expect(nav.hasAttribute('inert')).toBe(true)
  })

  it('applies the provided background colour', () => {
    const { nav } = renderDock({ color: '#123456' })
    expect(nav).toHaveStyle({ backgroundColor: '#123456' })
  })
})
