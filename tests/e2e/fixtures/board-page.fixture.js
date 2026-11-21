/**
 * Board Page E2E Test Fixtures
 *
 * Provides localStorage seeding, board navigation, canvas geometry helpers and
 * pointer-gesture helpers for the whiteboard (Library -> book -> topic -> Board).
 *
 * IMPORTANT — THE BOARD DOES NOT WORK IN THE SHIPPED APP
 * The shipped CSS gives `.board-surface` `flex: 1; height: auto` while its
 * parent `.board-wrap` is NOT a flex container, so the drawing surface
 * collapses to 0px and no board interaction is possible (defect BD-1).
 *
 * This suite therefore asserts the SHIPPED REALITY by default: every board
 * test fails on the "the board is usable" precondition with a message that
 * names BD-1. That is the honest signal until the CSS is fixed.
 *
 * Set BOARD_LAYOUT_WORKAROUND=1 to inject the layout fix *inside the test
 * browser only* (nothing in src/ is touched), which lets the board's
 * behaviour be exercised and the suite go green apart from the genuine
 * defects:
 *
 *     BOARD_LAYOUT_WORKAROUND=1 npx playwright test tests/e2e/board-page.spec.js --project=chromium
 */

import { expect } from '@playwright/test'

const pad = (value) => String(value).padStart(2, '0')

export const isoOffset = (offset) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const TODAY = isoOffset(0)
export const TOMORROW = isoOffset(1)

export const BOARD_LAYOUT_WORKAROUND_CSS = '.board-wrap { display: flex; flex-direction: column; }'

/**
 * True when the opt-in layout shim should be injected into the test browser.
 * Read through `globalThis` so the file stays lint-clean under the browser
 * globals configured for this project.
 */
export const layoutWorkaroundEnabled = () =>
  globalThis.process?.env?.BOARD_LAYOUT_WORKAROUND === '1'

/* ------------------------------------------------------------------ *
 * Data fixtures
 * ------------------------------------------------------------------ */

export const boardBooksFixture = () => [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TODAY, progress: 0 },
      { id: 't2', title: 'State patterns', chapter: 'Ch 9', due: TOMORROW, progress: 0 },
    ],
  },
]

export const emptyCanvas = () => ({ texts: [], strokes: [], shapes: [], nodes: [], edges: [] })

/**
 * A canvas pre-populated with one of every element kind.
 * World coordinates are laid out inside the desktop surface (550x600) and
 * away from the toolbar / props panel / zoom dock overlays.
 */
export const seededCanvas = (overrides = {}) => ({
  texts: [
    { id: 'tx-seed', x: 40, y: 390, text: 'Seeded text', color: '#1d2633', fontSize: 15 },
  ],
  strokes: [
    {
      id: 'st-seed',
      points: [{ x: 40, y: 320 }, { x: 160, y: 320 }, { x: 160, y: 360 }],
      color: '#1d2633',
      width: 2,
    },
  ],
  shapes: [
    { id: 'sh-seed-rect', type: 'rect', x: 40, y: 150, w: 120, h: 80, color: '#1d2633', fill: 'none', width: 2, label: 'Rect' },
    { id: 'sh-seed-ellipse', type: 'ellipse', x: 200, y: 150, w: 120, h: 80, color: '#4d88aa', fill: '#d8e8f2', width: 2, label: 'Ellipse' },
    { id: 'sh-seed-line', type: 'line', x: 40, y: 270, w: 120, h: 0, color: '#1d2633', fill: 'none', width: 2, label: '' },
    { id: 'sh-seed-arrow', type: 'arrow', x: 200, y: 270, w: 120, h: 0, color: '#bb8b3d', fill: 'none', width: 2, label: '' },
  ],
  nodes: [
    { id: 'nd-seed-a', x: 40, y: 450, label: 'Node A' },
    { id: 'nd-seed-b', x: 240, y: 450, label: 'Node B' },
  ],
  edges: [
    { id: 'eg-seed', from: 'nd-seed-a', to: 'nd-seed-b' },
  ],
  ...overrides,
})

/** Two mind-map nodes with no edge between them yet. */
export const mindMapCanvas = () => seededCanvas({
  texts: [],
  strokes: [],
  shapes: [],
  edges: [],
})

export const seedBoardStorage = (overrides = {}) => ({
  'revision-books': boardBooksFixture(),
  'revision-schedules': {},
  'revision-checklists': {},
  'revision-coverage': {},
  'revision-canvas': { t1: emptyCanvas(), t2: emptyCanvas() },
  'revision-settings': { reminderTime: '09:00', weeklyGoal: 5, compactMode: false, reducedMotion: false },
  ...overrides,
})

/* ------------------------------------------------------------------ *
 * Storage helpers
 * ------------------------------------------------------------------ */

export const initStorage = (page, storage) => {
  page.addInitScript((data) => {
    Object.entries(data).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }, storage)
}

export const initClearStorage = (page) => {
  page.addInitScript(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('revision-'))
      .forEach((key) => window.localStorage.removeItem(key))
  })
}

export const waitForAppReady = async (page) => {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => {
    try {
      return typeof JSON.parse(window.localStorage.getItem('revision-coverage') || '{}') === 'object'
    } catch {
      return false
    }
  })
}

/** Read the whole revision-canvas map from the page. */
export const readAllCanvases = async (page) => page.evaluate(() => {
  try {
    return JSON.parse(window.localStorage.getItem('revision-canvas') || '{}')
  } catch {
    return {}
  }
})

/** Read one topic's canvas from the page. */
export const readCanvas = async (page, topicId) => (await readAllCanvases(page))[topicId] ?? null

/**
 * Poll the persisted canvas until the predicate passes.
 * Avoids arbitrary sleeps when the app writes localStorage in an effect.
 */
export const waitForCanvas = async (page, topicId, predicate, timeout = 5000) => {
  await expect.poll(async () => {
    const canvas = await readCanvas(page, topicId)
    return canvas ? predicate(canvas) : false
  }, { timeout, message: `canvas for ${topicId} never satisfied the expected state` }).toBe(true)
}

/* ------------------------------------------------------------------ *
 * Layout workaround + navigation
 * ------------------------------------------------------------------ */

/** Inject the test-only layout stylesheet (see header note). */
export const applyBoardLayoutWorkaround = async (page) => {
  await page.addStyleTag({ content: BOARD_LAYOUT_WORKAROUND_CSS })
}

/**
 * Precondition for every board interaction: the drawing surface must have a
 * usable size. Fails with a message that names defect BD-1.
 */
export const expectBoardUsable = async (page) => {
  const box = await page.locator('.board-surface').boundingBox()
  expect(
    box?.height ?? 0,
    'The whiteboard has no usable drawing surface (defect BD-1): .board-surface is a block child of a non-flex .board-wrap, so its height:auto collapses to 0px and no board interaction can be performed. Fix .board-wrap in src/App.css, or re-run with BOARD_LAYOUT_WORKAROUND=1 to exercise the board logic inside the test browser.',
  ).toBeGreaterThan(200)
}

export const getDock = (page) => page.getByRole('navigation', { name: 'Primary navigation' })

/**
 * Navigate Library -> book -> topic -> Board tab.
 *
 * `applyWorkaround` defaults to the BOARD_LAYOUT_WORKAROUND environment flag.
 * `expectUsable` adds the "the board has a drawing surface" precondition that
 * every interaction test needs.
 */
export const openBoard = async (page, {
  topicTitle = 'Hooks in depth',
  applyWorkaround = layoutWorkaroundEnabled(),
  expectUsable = true,
} = {}) => {
  const dock = getDock(page)
  await dock.getByRole('button', { name: 'Library' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()

  await page.getByRole('button', { name: 'Open Learning React' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(`^${topicTitle}`) }).first().click()
  await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()

  await page.getByRole('tab', { name: 'Board' }).click()
  await expect(page.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')

  if (applyWorkaround) await applyBoardLayoutWorkaround(page)
  if (expectUsable) await expectBoardUsable(page)
  return page
}

/** Reload the app and re-apply the layout workaround when it is enabled. */
export const reloadApp = async (page) => {
  await page.reload()
  await waitForAppReady(page)
  if (layoutWorkaroundEnabled()) await applyBoardLayoutWorkaround(page)
}

/**
 * Seed one topic's canvas and reload so the board opens with it.
 *
 * A dedicated init script is registered (not `page.evaluate`) because the
 * suite's seeding init script re-runs on every navigation and would otherwise
 * overwrite the canvas during the reload. Init scripts run in registration
 * order, so this one wins.
 */
export const seedCanvasFor = async (page, canvas, topicId = 't1') => {
  await page.addInitScript((data) => {
    window.localStorage.setItem('revision-canvas', JSON.stringify(data))
  }, { [topicId]: canvas })

  await page.reload()
  await waitForAppReady(page)
  if (layoutWorkaroundEnabled()) await applyBoardLayoutWorkaround(page)
}

/**
 * Write storage directly and reload — used by the reload-persistence suite,
 * where no init script may run on the reload (it would re-seed the data).
 */
export const seedStorageAndReload = async (page, storage) => {
  await page.evaluate((data) => {
    Object.entries(data).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }, storage)

  await page.reload()
  await waitForAppReady(page)
  if (layoutWorkaroundEnabled()) await applyBoardLayoutWorkaround(page)
}

/** Move from the current topic to another topic's board. */
export const switchTopic = async (page, topicTitle) => {
  await page.getByRole('main').getByRole('button', { name: 'Learning React' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(`^${topicTitle}`) }).first().click()
  await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()

  await page.getByRole('tab', { name: 'Board' }).click()
  await expect(page.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
}

/* ------------------------------------------------------------------ *
 * Toolbar helpers
 * ------------------------------------------------------------------ */

export const boardSurface = (page) => page.locator('.board-surface')

export const toolButton = (page, name) => page.getByRole('button', { name, exact: true })

export const selectTool = async (page, name) => {
  await toolButton(page, name).click()
  await expect(toolButton(page, name)).toHaveAttribute('aria-pressed', 'true')
}

export const zoomLevel = (page) => page.getByTitle('Reset zoom')

export const strokeSwatches = (page) => page.getByRole('button', { name: /^Stroke #/ })
export const fillSwatches = (page) => page.getByRole('button', { name: /^Fill #/ })
export const noFillSwatch = (page) => page.getByRole('button', { name: 'No fill' })
export const propsPanel = (page) => page.locator('.board-props')
export const fontSizeReadout = (page) => page.locator('.board-size strong')
export const resizeHandles = (page) => page.locator('.board-overlay').getByRole('button', { name: 'Resize handle' })

export const shapeLabelInput = (page) => page.getByRole('textbox', { name: 'Shape label' })
export const boardTextInput = (page) => page.getByRole('textbox', { name: 'Board text' })
export const nodeLabelInput = (page) => page.getByRole('textbox', { name: 'Node label' })

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

/**
 * Map board world coordinates to viewport client coordinates.
 * Reads the live canvas transform so the mapping stays correct after zoom/pan.
 */
export const surfacePoint = async (page, x, y) => {
  const box = await boardSurface(page).boundingBox()
  if (!box) throw new Error('board surface has no bounding box')
  const transform = await page.locator('.board-canvas').evaluate((el) => el.style.transform || '')

  const translate = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(transform)
  const scale = /scale\(\s*(-?[\d.]+)\s*\)/.exec(transform)
  const tx = translate ? Number(translate[1]) : 0
  const ty = translate ? Number(translate[2]) : 0
  const s = scale ? Number(scale[1]) : 1

  return { x: box.x + tx + x * s, y: box.y + ty + y * s }
}

/**
 * A rectangle of the surface that is free of the toolbar, props panel and
 * zoom dock overlays (all of which swallow pointer events).
 */
export const safeArea = async (page) => {
  const box = await boardSurface(page).boundingBox()
  const top = 130
  return {
    left: 30,
    top,
    right: Math.max(top + 120, box.width - 140),
    bottom: Math.max(top + 120, box.height - 60),
  }
}

/** Click at a board world coordinate. */
export const clickOnSurface = async (page, x, y) => {
  const point = await surfacePoint(page, x, y)
  await page.mouse.click(point.x, point.y)
}

/** Double-click at a board world coordinate. */
export const doubleClickOnSurface = async (page, x, y) => {
  const point = await surfacePoint(page, x, y)
  await page.mouse.dblclick(point.x, point.y)
}

/** Press-drag-release between two board world coordinates. */
export const dragOnSurface = async (page, from, to, { steps = 8 } = {}) => {
  const start = await surfacePoint(page, from.x, from.y)
  const end = await surfacePoint(page, to.x, to.y)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps })
  await page.mouse.up()
}

/** Drag the centre of a resize handle to a board world coordinate. */
export const dragHandleTo = async (page, handle, x, y) => {
  const box = await handle.boundingBox()
  if (!box) throw new Error('resize handle has no bounding box')
  const target = await surfacePoint(page, x, y)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
}

/* ------------------------------------------------------------------ *
 * Touch helpers (Chromium CDP — Playwright's touchscreen API only taps)
 * ------------------------------------------------------------------ */

const touchPoint = (id, x, y) => ({ x, y, id, radiusX: 1, radiusY: 1, force: 1 })

/** Touch drag between two board world coordinates. */
export const touchDrag = async (page, from, to, { steps = 6 } = {}) => {
  const client = await page.context().newCDPSession(page)
  const start = await surfacePoint(page, from.x, from.y)
  const end = await surfacePoint(page, to.x, to.y)

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touchPoint(1, start.x, start.y)],
  })

  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint(1, start.x + (end.x - start.x) * ratio, start.y + (end.y - start.y) * ratio)],
    })
  }

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

/** Two-finger pinch centred on a board world coordinate. */
export const pinch = async (page, center, fromSpread, toSpread, { steps = 6 } = {}) => {
  const client = await page.context().newCDPSession(page)
  const origin = await surfacePoint(page, center.x, center.y)

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      touchPoint(1, origin.x - fromSpread / 2, origin.y),
      touchPoint(2, origin.x + fromSpread / 2, origin.y),
    ],
  })

  for (let step = 1; step <= steps; step += 1) {
    const spread = fromSpread + (toSpread - fromSpread) * (step / steps)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        touchPoint(1, origin.x - spread / 2, origin.y),
        touchPoint(2, origin.x + spread / 2, origin.y),
      ],
    })
  }

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

/* ------------------------------------------------------------------ *
 * Dialog helpers
 * ------------------------------------------------------------------ */

export const acceptNextDialog = (page) => page.once('dialog', (dialog) => dialog.accept())
export const dismissNextDialog = (page) => page.once('dialog', (dialog) => dialog.dismiss())
