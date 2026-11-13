import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from '../../src/App.jsx'
import { booksFixture, seedStorage } from './fixtures.js'

const writeStorage = (storage) => {
  Object.entries(storage).forEach(([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)))
}

export const renderApp = ({ storage, confirm = true, seed = true, resetStorage = seed } = {}) => {
  if (resetStorage) window.localStorage.clear()
  if (seed) seedStorage(storage)
  else if (storage) writeStorage(storage)
  const user = userEvent.setup()
  vi.spyOn(window, 'confirm').mockReturnValue(confirm)
  const result = render(<App />)
  return { user, ...result }
}

export const renderWithBooks = (overrides = {}, options = {}) =>
  renderApp({ ...options, storage: { 'revision-books': booksFixture(), ...overrides } })

export const appShell = () => document.querySelector('.app-shell')

export const mainRegion = () => within(screen.getByRole('main'))

export const dockButton = (name) => within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('button', { name })

export const navigateTo = async (user, name) => {
  await user.click(dockButton(name))
}

export const openBook = async (user, title) => {
  await navigateTo(user, 'Library')
  await user.click(screen.getByRole('button', { name: `Open ${title}` }))
}

export const openTopic = async (user, bookTitle, topicTitle) => {
  await openBook(user, bookTitle)
  await user.click(mainRegion().getByRole('button', { name: new RegExp(`^${topicTitle}`) }))
}
