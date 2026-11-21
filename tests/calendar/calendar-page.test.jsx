import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, renderWithBooks } from '../support/render-app.jsx'
import { openCalendar } from '../support/navigation.js'
import { dayLabel, monthLabel, monthOffsetFor, TODAY, TOMORROW, YESTERDAY, isoOffset } from '../support/fixtures.js'

const grid = () => screen.getByRole('grid', { name: `Review calendar for ${monthLabel(0)}` })

const selectDay = async (user, iso) => {
  const offset = monthOffsetFor(iso)
  for (let step = 0; step < Math.abs(offset); step += 1) {
    await user.click(screen.getByRole('button', { name: offset < 0 ? 'Previous month' : 'Next month' }))
  }
  const activeGrid = screen.getByRole('grid', { name: `Review calendar for ${monthLabel(offset)}` })
  await user.click(within(activeGrid).getByRole('button', { name: new RegExp(`^${dayLabel(iso)}`) }))
}

describe('Calendar page', () => {
  it('renders the month grid, legend, and today’s queued reviews', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    expect(screen.getByRole('heading', { level: 1, name: 'Your calendar' })).toBeInTheDocument()
    expect(grid()).toBeInTheDocument()
    expect(screen.getByText('Scheduled by you')).toBeInTheDocument()
    expect(screen.getByText('Auto plan')).toBeInTheDocument()
    expect(screen.getByText('Coverage logged')).toBeInTheDocument()

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Today’s reviews' })).toBeInTheDocument()
    expect(screen.getByText('1 queued')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hooks in depth/ })).toHaveTextContent('Hooks in depth')
  })

  it('marks today as selected by default', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)
    const todayCell = within(grid()).getByRole('button', { name: new RegExp(`^${dayLabel(TODAY)}`) })
    expect(todayCell).toHaveAttribute('aria-pressed', 'true')
    expect(todayCell).toHaveClass('is-today')
  })

  it('shows reviews for a selected future day', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    await selectDay(user, TOMORROW)

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Reviews on Tomorrow' })).toBeInTheDocument()
    expect(screen.getByText('1 queued')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /State patterns/ })).toBeInTheDocument()
  })

  it('shows coverage recorded for a past day', async () => {
    const app = renderWithBooks({ 'revision-coverage': { t1: { [YESTERDAY]: 75 } } })
    await openCalendar(app.user)
    await selectDay(app.user, YESTERDAY)

    expect(mainRegion().getByRole('heading', { level: 2, name: `Coverage on ${dayLabel(YESTERDAY)}` })).toBeInTheDocument()
    const covered = screen.getByRole('button', { name: /Hooks in depth/ })
    expect(covered).toHaveTextContent('75%')
    expect(covered).toHaveTextContent('covered')
  })

  it('explains when a past day has no coverage', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)
    await selectDay(user, isoOffset(-3))

    expect(screen.getByText('No coverage recorded for this day.')).toBeInTheDocument()
    expect(screen.getByText('0 queued')).toBeInTheDocument()
  })

  it('annotates calendar days with their review markers', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)
    const today = within(grid()).getByRole('button', { name: new RegExp(`^${dayLabel(TODAY)}`) })
    expect(today).toHaveAttribute('aria-label', `${dayLabel(TODAY)}, 1 review`)
  })

  it('opens a topic from a review row', async () => {
    const { user } = renderWithBooks()
    await openCalendar(user)

    await user.click(screen.getByRole('button', { name: /Hooks in depth/ }))
    expect(mainRegion().getByRole('button', { name: 'Learning React' })).toBeInTheDocument()
    expect(dockButton('Calendar').closest('nav')).toHaveClass('dock-hidden')
  })
})
