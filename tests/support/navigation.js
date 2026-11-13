import { screen } from '@testing-library/react'
import { dockButton, openTopic } from './render-app.jsx'

export const openCalendar = (user) => user.click(dockButton('Calendar'))

export const openInsights = (user) => user.click(dockButton('Insights'))

export const openSettings = (user) => user.click(dockButton('Settings'))

export const openNotes = async (user, bookTitle = 'Learning React', topicTitle = 'Hooks in depth') => {
  await openTopic(user, bookTitle, topicTitle)
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
}

export const openScheduleSheet = async (user, topicTitle = 'Hooks in depth') => {
  await user.click(screen.getByRole('button', { name: `Schedule ${topicTitle}` }))
  return screen.getByRole('dialog', { name: `Schedule review: ${topicTitle}` })
}

export const openRescheduleSheet = async (user, topicTitle = 'Hooks in depth') => {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Reschedule ${topicTitle}`) }))
  return screen.getByRole('dialog', { name: `Schedule review: ${topicTitle}` })
}
