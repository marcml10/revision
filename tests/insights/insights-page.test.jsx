import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithBooks } from '../support/render-app.jsx'
import { openInsights } from '../support/navigation.js'
import { entry, item, isoOffset, TODAY, YESTERDAY } from '../support/fixtures.js'

describe('Insights page', () => {
  it('renders the live panel and weekly chart with no data', async () => {
    const { user } = renderWithBooks()
    await openInsights(user)

    expect(screen.getByRole('heading', { level: 1, name: 'Your rhythm' })).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('0 days')).toBeInTheDocument()
    expect(screen.getByText('No progress yet — tick a point to start a streak.')).toBeInTheDocument()
    expect(screen.getByText('Avg daily coverage')).toBeInTheDocument()
    expect(screen.getByText('Points ticked today')).toBeInTheDocument()
    expect(screen.getByText('Topics covered today')).toBeInTheDocument()
    expect(screen.getByLabelText('Daily coverage over the last 7 days')).toBeInTheDocument()
    expect(screen.getByText(/5 more topics to reach your weekly goal/)).toBeInTheDocument()
  })

  it('tracks today’s coverage, points, and covered topics', async () => {
    const { user } = renderWithBooks({
      'revision-checklists': { t1: entry([item('i1', 'Read docs', true)]) },
      'revision-coverage': { t1: { [TODAY]: 100, [YESTERDAY]: 90 } },
    })
    await openInsights(user)

    expect(screen.getAllByText('1/1').length).toBeGreaterThan(0)
    expect(screen.getByText('+10%')).toBeInTheDocument()
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
    expect(screen.getByText('Topics covered today').closest('.insight-card')).toHaveTextContent('1')
    expect(screen.getByText('Avg daily coverage').closest('.insight-card')).toHaveTextContent('95%')
  })

  it('computes a three day streak from the coverage log', async () => {
    const { user } = renderWithBooks({
      'revision-coverage': {
        t1: { [TODAY]: 100, [YESTERDAY]: 100, [isoOffset(-2)]: 100 },
      },
    })
    await openInsights(user)

    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.getByText(/Extended to 3 days/)).toBeInTheDocument()
  })

  it('warns that a streak is at risk when today is untouched', async () => {
    const { user } = renderWithBooks({
      'revision-coverage': { t1: { [YESTERDAY]: 80 } },
    })
    await openInsights(user)

    expect(screen.getByText('1 day')).toBeInTheDocument()
    expect(screen.getByText('At risk — no progress yet today.')).toBeInTheDocument()
  })

  it('starts a streak with the first progress of the day', async () => {
    const { user } = renderWithBooks({
      'revision-coverage': { t1: { [TODAY]: 25 } },
    })
    await openInsights(user)

    expect(screen.getByText('1 day')).toBeInTheDocument()
    expect(screen.getByText('Extended to 1 day — keep it going!')).toBeInTheDocument()
  })

  it('breaks the streak when neither today nor yesterday has progress', async () => {
    const { user } = renderWithBooks({
      'revision-coverage': { t1: { [isoOffset(-2)]: 60 } },
    })
    await openInsights(user)

    expect(screen.getByText('0 days')).toBeInTheDocument()
    expect(screen.getByText('No progress yet — tick a point to start a streak.')).toBeInTheDocument()
  })

  it('reflects the weekly goal from settings', async () => {
    const { user } = renderWithBooks({
      'revision-settings': { reminderTime: '09:00', weeklyGoal: 3, compactMode: false, reducedMotion: false },
    })
    await openInsights(user)
    expect(screen.getByText(/3 more topics to reach your weekly goal/)).toBeInTheDocument()
  })
})
