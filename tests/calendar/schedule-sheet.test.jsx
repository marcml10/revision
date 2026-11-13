import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithBooks } from '../support/render-app.jsx'
import { openRescheduleSheet, openScheduleSheet } from '../support/navigation.js'
import { dayLabel, monthOffsetFor, TOMORROW } from '../support/fixtures.js'

const pickTomorrow = async (user) => {
  const offset = monthOffsetFor(TOMORROW)
  for (let step = 0; step < offset; step += 1) {
    await user.click(screen.getByRole('button', { name: 'Next month' }))
  }
  await user.click(screen.getByRole('button', { name: dayLabel(TOMORROW) }))
}

describe('Schedule sheet', () => {
  it('saves a date and time for a topic', async () => {
    const { user } = renderWithBooks()
    const dialog = await openScheduleSheet(user)

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await pickTomorrow(user)
    await user.click(screen.getByRole('radio', { name: '5:30 PM' }))
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reschedule Hooks in depth, currently Tomorrow at 5:30 PM' })).toBeInTheDocument()
  })

  it('labels the next focus card as scheduled after saving', async () => {
    const { user } = renderWithBooks()
    await openScheduleSheet(user)
    await pickTomorrow(user)
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))

    expect(screen.getByRole('button', { name: /Scheduled/ })).toHaveTextContent('Hooks in depth')
  })

  it('returns a topic to its automatic plan', async () => {
    const { user } = renderWithBooks({
      'revision-schedules': { t1: { date: TOMORROW, time: '17:30' } },
    })

    await openRescheduleSheet(user)
    await user.click(screen.getByRole('button', { name: /Back to auto/ }))

    expect(screen.getByRole('button', { name: 'Schedule Hooks in depth' })).toBeInTheDocument()
  })

  it('prefills an existing schedule', async () => {
    const { user } = renderWithBooks({
      'revision-schedules': { t1: { date: TOMORROW, time: '07:30' } },
    })

    await openRescheduleSheet(user)
    expect(screen.getByRole('radio', { name: '7:30 AM' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Custom time')).toHaveValue('07:30')
  })

  it('closes on Escape and on backdrop click', async () => {
    const { user } = renderWithBooks()

    await openScheduleSheet(user)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await openScheduleSheet(user)
    fireEvent.click(document.querySelector('.sheet-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the sheet open when the dialog body is clicked', async () => {
    const { user } = renderWithBooks()
    await openScheduleSheet(user)

    await user.click(screen.getByText('Pick a day'))
    expect(screen.getByRole('dialog', { name: 'Schedule review: Hooks in depth' })).toBeInTheDocument()
  })

  it('offers the reminder default as the initial time', async () => {
    const { user } = renderWithBooks()
    await openScheduleSheet(user)

    expect(screen.getByLabelText('Custom time')).toHaveValue('09:00')
  })
})
