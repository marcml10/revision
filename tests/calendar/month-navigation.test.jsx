import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithBooks } from '../support/render-app.jsx'
import { openCalendar } from '../support/navigation.js'
import { dayLabel, monthLabel, TODAY } from '../support/fixtures.js'

describe('Calendar month navigation', () => {
  it('moves to the next and previous month', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { level: 2, name: monthLabel(1) })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: `Review calendar for ${monthLabel(1)}` })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { level: 2, name: monthLabel(0) })).toBeInTheDocument()
  })

  it('jumps back to today from another month', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(screen.getByRole('heading', { level: 2, name: monthLabel(0) })).toBeInTheDocument()
    const today = within(screen.getByRole('grid', { name: `Review calendar for ${monthLabel(0)}` }))
      .getByRole('button', { name: new RegExp(`^${dayLabel(TODAY)}`) })
    expect(today).toHaveAttribute('aria-pressed', 'true')
  })

  it('disables previous navigation at the twelve month back stop', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    for (let step = 0; step < 12; step += 1) {
      await user.click(screen.getByRole('button', { name: 'Previous month' }))
    }
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  it('disables next navigation at the eleven month forward stop', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    for (let step = 0; step < 11; step += 1) {
      await user.click(screen.getByRole('button', { name: 'Next month' }))
    }
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })
})
