import { expect, test } from '@playwright/test'
import {
  seedBoardStorage,
  emptyCanvas,
  seededCanvas,
  mindMapCanvas,
  initStorage,
  initClearStorage,
  waitForAppReady,
  readCanvas,
  readAllCanvases,
  waitForCanvas,
  openBoard,
  seedCanvasFor,
  reloadApp,
  seedStorageAndReload,
  switchTopic,
  applyBoardLayoutWorkaround,
  boardSurface,
  toolButton,
  selectTool,
  zoomLevel,
  propsPanel,
  resizeHandles,
  shapeLabelInput,
  boardTextInput,
  nodeLabelInput,
  clickOnSurface,
  doubleClickOnSurface,
  dragOnSurface,
  dragHandleTo,
  acceptNextDialog,
} from './fixtures/board-page.fixture.js'

const TOOLS = ['Select', 'Pen', 'Rectangle', 'Ellipse', 'Arrow', 'Line', 'Text', 'Eraser', 'Mind map']

test.describe('Board Page — Integration Tests', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'Board suite targets the desktop viewport; touch is covered in board-page.mobile.spec.js')

  test.beforeEach(async ({ page }) => {
    initClearStorage(page)
    initStorage(page, seedBoardStorage())
    await page.goto('/')
    await waitForAppReady(page)
  })

  // ============================================================
  // A. Known defects
  // ============================================================
  test.describe('Known Defects', () => {
    test('B-00: board drawing surface has a usable height (P1 regression)', async ({ page }) => {
      await openBoard(page, { applyWorkaround: false, expectUsable: false })

      const box = await boardSurface(page).boundingBox()
      expect(
        box?.height ?? 0,
        'board surface must have a non-zero height to be drawable — see the .board-wrap flex layout regression',
      ).toBeGreaterThan(200)
    })

    test('B-61: the mind-map node label editor keeps focus after the node is created', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Mind map')

      await clickOnSurface(page, 120, 300)

      await expect(nodeLabelInput(page)).toBeVisible()
      await expect(nodeLabelInput(page)).toBeFocused()
      await expect(page.locator('.board-node')).toHaveCount(1)
    })

    test('B-62: elements created in quick succession keep unique ids', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).fill('First')
      await shapeLabelInput(page).press('Enter')
      await dragOnSurface(page, { x: 60, y: 320 }, { x: 200, y: 380 })
      await shapeLabelInput(page).fill('Second')
      await shapeLabelInput(page).press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 2)
      const canvas = await readCanvas(page, 't1')
      const ids = canvas.shapes.map((shape) => shape.id)
      expect(new Set(ids).size, `shape ids collided: ${ids.join(', ')}`).toBe(ids.length)
      await expect(page.locator('.board-shape-label')).toHaveCount(2)
    })
  })

  // ============================================================
  // B. Entry & Toolbar
  // ============================================================
  test.describe('Entry & Toolbar', () => {
    test('B-01: Board tab renders the surface, all tools and the zoom dock', async ({ page }) => {
      await openBoard(page)

      await expect(boardSurface(page)).toBeVisible()
      for (const tool of TOOLS) {
        await expect(toolButton(page, tool)).toBeVisible()
      }
      await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Clear board' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Hide tools' })).toBeVisible()
      await expect(zoomLevel(page)).toHaveText('100%')
    })

    test('B-08: the properties panel hides once the canvas is used and returns on selection', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await selectTool(page, 'Rectangle')
      await expect(propsPanel(page)).toBeVisible()

      await clickOnSurface(page, 400, 500)
      await expect(propsPanel(page)).toHaveCount(0)

      await selectTool(page, 'Select')
      await clickOnSurface(page, 100, 190)
      await expect(propsPanel(page)).toBeVisible()
    })
  })

  // ============================================================
  // C. Drawing shapes
  // ============================================================
  test.describe('Drawing Shapes', () => {
    test('B-09: dragging with the Rectangle tool creates a normalised rectangle', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await expect(shapeLabelInput(page)).toBeVisible()
      await shapeLabelInput(page).press('Escape')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0]).toMatchObject({ type: 'rect', x: 60, y: 200, w: 140, h: 80 })
    })

    test('B-10: a new rectangle opens a label editor and grows to fit its label', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 120, y: 240 })
      const label = shapeLabelInput(page)
      await expect(label).toBeVisible()

      await label.fill('Understanding')
      await label.press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes[0]?.label === 'Understanding')
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0].label).toBe('Understanding')
      expect(canvas.shapes[0].w).toBeGreaterThan(60)
      await expect(page.locator('.board-shape-label')).toHaveText('Understanding')
    })

    test('B-11: escaping the label editor of a new shape keeps an unlabelled shape', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes).toHaveLength(1)
      expect(canvas.shapes[0].label).toBe('')
    })

    test('B-12: the Ellipse tool creates an ellipse and honours the chosen fill', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Ellipse')

      await expect(page.getByRole('button', { name: 'No fill' })).toBeVisible()
      await page.getByRole('button', { name: 'Fill #f9ddd5' }).click()

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0].type).toBe('ellipse')
      expect(canvas.shapes[0].fill).toBe('#f9ddd5')
    })

    test('B-13: the Arrow tool creates an arrow without a label editor', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Arrow')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      expect(shapeLabelInput(page)).toHaveCount(0)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0].type).toBe('arrow')
    })

    test('B-14: the Line tool creates a line without a label editor', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Line')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      expect(shapeLabelInput(page)).toHaveCount(0)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0].type).toBe('line')
    })

    test('B-16: the chosen stroke colour is applied to the next shape', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await page.getByRole('button', { name: 'Stroke #d96855' }).click()
      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes[0].color).toBe('#d96855')
    })
  })

  // ============================================================
  // D. Pen strokes
  // ============================================================
  test.describe('Pen Strokes', () => {
    test('B-17: dragging with the Pen tool records a stroke', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Pen')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })

      await waitForCanvas(page, 't1', (canvas) => canvas.strokes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.strokes[0].points.length).toBeGreaterThan(1)
      expect(canvas.strokes[0].points[0].x).toBeCloseTo(60, 0)
      expect(canvas.strokes[0].points[0].y).toBeCloseTo(200, 0)
    })

    test('B-19: the chosen stroke colour is applied to the next pen stroke', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Pen')

      await page.getByRole('button', { name: 'Stroke #4d88aa' }).click()
      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })

      await waitForCanvas(page, 't1', (canvas) => canvas.strokes.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.strokes[0].color).toBe('#4d88aa')
    })
  })

  // ============================================================
  // E. Text
  // ============================================================
  test.describe('Text', () => {
    test('B-20: the Text tool places an editable text element', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Text')

      await clickOnSurface(page, 100, 250)
      const input = boardTextInput(page)
      await expect(input).toBeVisible()

      await input.fill('Hello board')
      await input.press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.texts.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.texts[0].text).toBe('Hello board')
      await expect(page.locator('.board-text')).toHaveText('Hello board')
    })

    test('B-23: double-clicking a text element opens it for editing', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await doubleClickOnSurface(page, 60, 398)
      const input = boardTextInput(page)
      await expect(input).toHaveValue('Seeded text')

      await input.fill('Updated text')
      await input.press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.texts[0]?.text === 'Updated text')
      await expect(page.locator('.board-text')).toHaveText('Updated text')
    })

    test('B-24: clearing an existing text and submitting removes it', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await doubleClickOnSurface(page, 60, 398)
      const input = boardTextInput(page)
      await expect(input).toHaveValue('Seeded text')

      await input.fill('')
      await input.press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.texts.length === 0)
      await expect(page.locator('.board-text')).toHaveCount(0)
    })
  })

  // ============================================================
  // F. Mind map
  // ============================================================
  test.describe('Mind Map', () => {
    test('B-28: double-clicking a node opens it for editing', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await doubleClickOnSurface(page, 60, 460)
      const input = nodeLabelInput(page)
      await expect(input).toHaveValue('Node A')

      await input.fill('Renamed node')
      await input.press('Enter')

      await waitForCanvas(page, 't1', (canvas) => canvas.nodes.find((node) => node.id === 'nd-seed-a')?.label === 'Renamed node')
    })

    test('B-29: clicking one node then another links them with an edge', async ({ page }) => {
      await seedCanvasFor(page, mindMapCanvas())
      await openBoard(page)
      await selectTool(page, 'Mind map')

      await clickOnSurface(page, 60, 460)
      await clickOnSurface(page, 260, 460)

      await waitForCanvas(page, 't1', (canvas) => canvas.edges.length === 1)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.edges[0].from).toBe('nd-seed-a')
      expect(canvas.edges[0].to).toBe('nd-seed-b')
    })

    test('B-30: deleting a node also removes the edges attached to it', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)
      await selectTool(page, 'Select')

      await clickOnSurface(page, 60, 460)
      await page.keyboard.press('Delete')

      await waitForCanvas(page, 't1', (canvas) => canvas.nodes.length === 1 && canvas.edges.length === 0)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.nodes.map((node) => node.id)).toEqual(['nd-seed-b'])
      expect(canvas.edges).toHaveLength(0)
    })
  })

  // ============================================================
  // G. Selection, move & resize
  // ============================================================
  test.describe('Selection, Move & Resize', () => {
    test('B-31: selecting a closed shape shows four resize handles, a line shows two', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 190)
      await expect(resizeHandles(page)).toHaveCount(4)

      await clickOnSurface(page, 100, 270)
      await expect(resizeHandles(page)).toHaveCount(2)
    })

    test('B-32: dragging a selected shape moves it by the drag delta', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await dragOnSurface(page, { x: 100, y: 190 }, { x: 150, y: 220 })

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.find((shape) => shape.id === 'sh-seed-rect')?.x === 90)
      const canvas = await readCanvas(page, 't1')
      const rect = canvas.shapes.find((shape) => shape.id === 'sh-seed-rect')
      expect(rect).toMatchObject({ x: 90, y: 180, w: 120, h: 80 })
    })

    test('B-33: dragging a resize handle resizes the shape', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 190)
      await expect(resizeHandles(page)).toHaveCount(4)

      const bottomRight = resizeHandles(page).nth(3)
      await dragHandleTo(page, bottomRight, 240, 300)

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.find((shape) => shape.id === 'sh-seed-rect')?.w === 200)
      const canvas = await readCanvas(page, 't1')
      const rect = canvas.shapes.find((shape) => shape.id === 'sh-seed-rect')
      expect(rect).toMatchObject({ x: 40, y: 150, w: 200, h: 150 })
    })

    test('B-34: clicking empty canvas clears the selection', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 190)
      await expect(resizeHandles(page)).toHaveCount(4)
      await expect(propsPanel(page)).toBeVisible()

      await clickOnSurface(page, 400, 520)
      await expect(resizeHandles(page)).toHaveCount(0)
      await expect(propsPanel(page)).toHaveCount(0)
    })

    test('B-35: dragging a text element moves it', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await dragOnSurface(page, { x: 60, y: 398 }, { x: 80, y: 418 })

      await waitForCanvas(page, 't1', (canvas) => canvas.texts[0]?.x === 60)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.texts[0]).toMatchObject({ x: 60, y: 410, text: 'Seeded text' })
    })

    test('B-36: dragging a node moves it', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await dragOnSurface(page, { x: 60, y: 460 }, { x: 80, y: 480 })

      await waitForCanvas(page, 't1', (canvas) => canvas.nodes.find((node) => node.id === 'nd-seed-a')?.x === 60)
      const canvas = await readCanvas(page, 't1')
      const node = canvas.nodes.find((item) => item.id === 'nd-seed-a')
      expect(node).toMatchObject({ x: 60, y: 470, label: 'Node A' })
    })
  })

  // ============================================================
  // H. Removal
  // ============================================================
  test.describe('Removal', () => {
    test('B-37: the Delete key removes the selected shape', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 190)
      await page.keyboard.press('Delete')

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 3)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes.map((shape) => shape.id)).not.toContain('sh-seed-rect')
    })

    test('B-39: the Delete key removes the selected stroke', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 320)
      await page.keyboard.press('Delete')

      await waitForCanvas(page, 't1', (canvas) => canvas.strokes.length === 0)
    })

    test('B-40: the Delete key removes the selected text', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 60, 398)
      await page.keyboard.press('Delete')

      await waitForCanvas(page, 't1', (canvas) => canvas.texts.length === 0)
    })

    test('B-41: the eraser removes the shape under the cursor', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)
      await selectTool(page, 'Eraser')

      await clickOnSurface(page, 100, 190)

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 3)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes.map((shape) => shape.id)).not.toContain('sh-seed-rect')
    })

    test('B-42: dragging the eraser removes a stroke', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)
      await selectTool(page, 'Eraser')

      await dragOnSurface(page, { x: 40, y: 320 }, { x: 160, y: 320 })

      await waitForCanvas(page, 't1', (canvas) => canvas.strokes.length === 0)
    })
  })

  // ============================================================
  // I. Undo / Redo
  // ============================================================
  test.describe('Undo & Redo', () => {
    test('B-44: undo reverts the last drawing and is enabled once something is drawn', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
      await page.getByRole('button', { name: 'Undo' }).click()

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 0)
    })

    test('B-45: redo re-applies an undone drawing', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      await page.getByRole('button', { name: 'Undo' }).click()
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 0)

      await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
      await page.getByRole('button', { name: 'Redo' }).click()

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
    })

    test('B-46: Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y drive the history', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      await page.keyboard.press('Control+z')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 0)

      await page.keyboard.press('Control+Shift+z')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      await page.keyboard.press('Control+z')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 0)

      await page.keyboard.press('Control+y')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)
    })

    test('B-48: undo restores a deleted element', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await clickOnSurface(page, 100, 190)
      await page.keyboard.press('Delete')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 3)

      await page.getByRole('button', { name: 'Undo' }).click()

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 4)
      const canvas = await readCanvas(page, 't1')
      expect(canvas.shapes.map((shape) => shape.id)).toContain('sh-seed-rect')
    })
  })

  // ============================================================
  // J. Clear board
  // ============================================================
  test.describe('Clear Board', () => {
    test('B-50: accepting the confirmation clears every element type', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      acceptNextDialog(page)
      await page.getByRole('button', { name: 'Clear board' }).click()

      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 0 && canvas.nodes.length === 0)
      const canvas = await readCanvas(page, 't1')
      expect(canvas).toEqual({ texts: [], strokes: [], shapes: [], nodes: [], edges: [] })
    })
  })

  // ============================================================
  // K. Zoom & pan
  // ============================================================
  test.describe('Zoom & Pan', () => {
    test('B-53: the plain wheel pans the canvas while Ctrl+wheel zooms it', async ({ page }) => {
      await openBoard(page)

      const transformBefore = await page.locator('.board-canvas').evaluate((el) => el.style.transform)

      const box = await boardSurface(page).boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, 120)

      const transformAfterPan = await page.locator('.board-canvas').evaluate((el) => el.style.transform)
      expect(transformAfterPan).not.toBe(transformBefore)
      expect(transformAfterPan).toContain('translate(0px, -120px)')
      await expect(zoomLevel(page)).toHaveText('100%')

      await page.evaluate(() => {
        const surface = document.querySelector('.board-surface')
        surface.dispatchEvent(new WheelEvent('wheel', {
          deltaY: -120,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          clientX: 100,
          clientY: 100,
        }))
      })

      await expect(zoomLevel(page)).not.toHaveText('100%')
      await expect(zoomLevel(page)).toHaveText('130%')
    })

    test('B-54: holding space and dragging pans the canvas', async ({ page }) => {
      await openBoard(page)

      await page.keyboard.down('Space')
      await expect(boardSurface(page)).toHaveClass(/pan-ready/)

      await dragOnSurface(page, { x: 100, y: 300 }, { x: 200, y: 350 })
      await page.keyboard.up('Space')

      const transform = await page.locator('.board-canvas').evaluate((el) => el.style.transform)
      expect(transform).toContain('translate(100px, 50px)')
      await expect(zoomLevel(page)).toHaveText('100%')
    })
  })

  // ============================================================
  // L. Persistence & isolation
  // ============================================================
  test.describe('Persistence & Isolation', () => {
    test('B-55: a drawn shape is written to the revision-canvas storage key', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      const all = await readAllCanvases(page)
      expect(all.t1.shapes).toHaveLength(1)
      expect(all.t1.shapes[0]).toMatchObject({ type: 'rect', x: 60, y: 200, w: 140, h: 80 })
      expect(all.t2.shapes).toHaveLength(0)
    })

    test('B-56: each topic keeps its own board', async ({ page }) => {
      await openBoard(page)
      await selectTool(page, 'Rectangle')

      await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
      await shapeLabelInput(page).press('Escape')
      await waitForCanvas(page, 't1', (canvas) => canvas.shapes.length === 1)

      await switchTopic(page, 'State patterns')

      const canvas = await readCanvas(page, 't2')
      expect(canvas?.shapes ?? []).toHaveLength(0)
      expect(canvas?.texts ?? []).toHaveLength(0)
    })

    test('B-57: switching to Notes and back keeps the drawing', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await page.getByRole('tab', { name: 'Notes' }).click()
      await expect(page.getByRole('textbox', { name: 'Notes' })).toBeVisible()

      await page.getByRole('tab', { name: 'Board' }).click()
      await expect(page.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')

      await expect(page.locator('.board-shape-label')).toHaveCount(2)
      await expect(page.locator('.board-node-label')).toHaveCount(2)
    })

    test('B-58: a reloaded board re-renders the saved elements', async ({ page }) => {
      await seedCanvasFor(page, seededCanvas())
      await openBoard(page)

      await reloadApp(page)
      await openBoard(page)

      await expect(page.locator('.board-shape-label')).toHaveCount(2)
      await expect(page.locator('.board-node-label')).toHaveCount(2)
      await expect(page.locator('.board-text')).toHaveText('Seeded text')
    })
  })
})

// ============================================================
// Reload persistence
// ============================================================
test.describe('Board Page — Reload Persistence', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'Board suite targets the desktop viewport')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('B-59: a drawn shape is still on the board after a full reload', async ({ page }) => {
    await seedStorageAndReload(page, seedBoardStorage())

    await openBoard(page)
    await selectTool(page, 'Rectangle')
    await dragOnSurface(page, { x: 60, y: 200 }, { x: 200, y: 280 })
    await shapeLabelInput(page).fill('Persisted shape')
    await shapeLabelInput(page).press('Enter')
    await waitForCanvas(page, 't1', (canvas) => canvas.shapes[0]?.label === 'Persisted shape')

    await page.reload()
    await waitForAppReady(page)
    await applyBoardLayoutWorkaround(page)
    await openBoard(page)

    await expect(page.locator('.board-shape-label')).toHaveText('Persisted shape')
    const canvas = await readCanvas(page, 't1')
    expect(canvas.shapes).toHaveLength(1)
    expect(canvas.shapes[0].label).toBe('Persisted shape')
  })

  test('B-60: board content of one topic does not leak into another topic', async ({ page }) => {
    await seedStorageAndReload(page, seedBoardStorage({
      'revision-canvas': {
        t1: { texts: [{ id: 'tx-1', x: 40, y: 200, text: 'Topic one text', color: '#1d2633', fontSize: 15 }], strokes: [], shapes: [], nodes: [], edges: [] },
        t2: emptyCanvas(),
      },
    }))

    await openBoard(page)
    await expect(page.locator('.board-text')).toHaveText('Topic one text')

    await switchTopic(page, 'State patterns')
    await expect(page.locator('.board-text')).toHaveCount(0)
  })
})
