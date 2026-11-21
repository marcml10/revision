import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithBooks } from '../support/render-app.jsx'
import { openBoard } from '../support/navigation.js'

const mountBoard = async () => {
  const app = renderWithBooks()
  await openBoard(app.user)
  return app
}

describe('Topic board (smoke)', () => {
  it('renders the drawing tools and undo history controls', async () => {
    await mountBoard()

    for (const tool of ['Select', 'Pen', 'Rectangle', 'Ellipse', 'Arrow', 'Line', 'Text', 'Eraser', 'Mind map']) {
      expect(screen.getByRole('button', { name: tool })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear board' })).toBeEnabled()
  })

  it('marks the selected tool and reveals stroke settings', async () => {
    const { user } = await mountBoard()

    const pen = screen.getByRole('button', { name: 'Pen' })
    await user.click(pen)

    expect(pen).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { name: /^Stroke #/ })).toHaveLength(6)
  })

  it('shows fill options for closed shapes', async () => {
    const { user } = await mountBoard()

    await user.click(screen.getByRole('button', { name: 'Rectangle' }))

    expect(screen.getByRole('button', { name: 'No fill' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Fill #/ })).toHaveLength(6)
  })

  it('zooms in and out around the reset level', async () => {
    const { user } = await mountBoard()

    expect(screen.getByTitle('Reset zoom')).toHaveTextContent('100%')

    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByTitle('Reset zoom')).toHaveTextContent('125%')

    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByTitle('Reset zoom')).toHaveTextContent('80%')
  })

  it('packs and unpacks the toolbar', async () => {
    const { user } = await mountBoard()

    await user.click(screen.getByRole('button', { name: 'Hide tools' }))
    expect(screen.queryByRole('button', { name: 'Pen' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show tools' }))
    expect(screen.getByRole('button', { name: 'Pen' })).toBeInTheDocument()
  })

  it('asks for confirmation before clearing the board', async () => {
    const { user } = await mountBoard()

    await user.click(screen.getByRole('button', { name: 'Clear board' }))
    expect(window.confirm).toHaveBeenCalledWith('Clear everything on this board?')
  })
})
