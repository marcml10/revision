import { expect, test } from '@playwright/test'
import {
  seedBoardStorage,
  initStorage,
  initClearStorage,
  waitForAppReady,
  readCanvas,
  waitForCanvas,
  openBoard,
  selectTool,
  zoomLevel,
  shapeLabelInput,
  touchDrag,
  pinch,
} from './fixtures/board-page.fixture.js'

/**
 * Touch coverage for the whiteboard (Pixel 7 project).
 *
 * The desktop suite drives the board with a mouse; this suite drives it with
 * real touch events so the touch-specific code paths (pointerType "touch",
 * two-finger pinch zoom) are covered.
 */
test.describe('Board Page — Mobile Touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'runs on the mobile-chromium project only')

  test.beforeEach(async ({ page }) => {
    initClearStorage(page)
    initStorage(page, seedBoardStorage())
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('B-63: a touch drag creates a rectangle', async ({ page }) => {
    await openBoard(page)
    await selectTool(page, 'Rectangle')

    await touchDrag(page, { x: 60, y: 300 }, { x: 200, y: 380 })

    await expect(shapeLabelInput(page)).toBeVisible()
    await shapeLabelInput(page).press('Escape')

    await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
    const canvas = await readCanvas(page, 't1')
    expect(canvas.shapes[0]).toMatchObject({ type: 'rect', x: 60, y: 300, w: 140, h: 80 })
  })

  test('B-64: a touch drag creates a pen stroke', async ({ page }) => {
    await openBoard(page)
    await selectTool(page, 'Pen')

    await touchDrag(page, { x: 60, y: 300 }, { x: 200, y: 380 })

    await waitForCanvas(page, 't1', (canvas) => canvas.strokes.length === 1)
    const canvas = await readCanvas(page, 't1')
    expect(canvas.strokes[0].points.length).toBeGreaterThan(1)
  })

  test('B-65: a two finger pinch zooms the canvas', async ({ page }) => {
    await openBoard(page)

    await expect(zoomLevel(page)).toHaveText('100%')

    await pinch(page, { x: 180, y: 400 }, 80, 160)

    await expect(zoomLevel(page)).toHaveText('200%')
  })

  test('B-66: a touch tap places a text element', async ({ page }) => {
    await openBoard(page)
    await selectTool(page, 'Text')

    const point = await page.locator('.board-surface').boundingBox()
    await page.touchscreen.tap(point.x + 120, point.y + 300)

    // Regression: the text input is mounted from the pointerup handler, but a
    // touch moves focus on the following click, so the editor is blurred
    // immediately and the empty text is discarded. The same flow works with a
    // mouse (B-20) because a mouse moves focus on mousedown, i.e. earlier.
    const input = page.getByRole('textbox', { name: 'Board text' })
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
    await input.fill('Touched')
    await input.press('Enter')

    await waitForCanvas(page, 't1', (canvas) => canvas.texts.length === 1)
    const canvas = await readCanvas(page, 't1')
    expect(canvas.texts[0].text).toBe('Touched')
  })

  test('B-67: a touch tap creates a mind-map node', async ({ page }) => {
    await openBoard(page)
    await selectTool(page, 'Mind map')

    const point = await page.locator('.board-surface').boundingBox()
    await page.touchscreen.tap(point.x + 120, point.y + 300)

    // The mirror image of B-61: with touch the node survives because focus is
    // not moved by a mousedown-style default action, while the same flow is
    // broken with a mouse.
    const input = page.getByRole('textbox', { name: 'Node label' })
    await expect(input).toBeVisible()
    await input.fill('Touch node')
    await input.press('Enter')

    await waitForCanvas(page, 't1', (canvas) => canvas.nodes.length === 1)
    const canvas = await readCanvas(page, 't1')
    expect(canvas.nodes[0].label).toBe('Touch node')
  })
})
