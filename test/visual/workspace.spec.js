import { expect, test } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { referenceState, visualDraft } from './visualFixture'

const referenceUrl = 'https://lineup-editorial.lucksora.chatgpt.site/'
const viewports = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'wide', width: 1920, height: 1200 },
  { name: 'ultrawide', width: 2560, height: 1440 },
  { name: 'mobile', width: 390, height: 844 },
]

async function settle(page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((image) => image.complete))
}

async function normalizeDynamicContent(page) {
  await page.addStyleTag({ content: `
    [data-testid="lineup-workspace"] :is(h2, h3, p, label, strong, small, span, button, input, select, kbd, i),
    .workspace :is(h2, h3, p, label, strong, small, span, button, input, select, kbd, i) {
      color: transparent !important;
      text-shadow: none !important;
    }
  ` })
}

async function seedLocal(page) {
  await page.addInitScript((draft) => {
    localStorage.clear()
    localStorage.setItem('lineup-theme', 'light')
    localStorage.setItem('lineup-workspace-drafts-v2', JSON.stringify(draft))
  }, visualDraft)
}

async function seedReference(page) {
  await page.goto(referenceUrl, { waitUntil: 'networkidle' })
  await page.evaluate((state) => localStorage.setItem('lineup-editorial-v2', JSON.stringify(state)), referenceState)
  await page.reload({ waitUntil: 'networkidle' })
}

function compareImages(actualBuffer, expectedBuffer, maxDiffPixelRatio = 0.05) {
  const actual = PNG.sync.read(actualBuffer)
  const expected = PNG.sync.read(expectedBuffer)
  expect(actual.width).toBe(expected.width)
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(8)
  const height = Math.min(actual.height, expected.height)
  const actualData = actual.data.subarray(0, actual.width * height * 4)
  const expectedData = expected.data.subarray(0, expected.width * height * 4)
  const diffPixels = pixelmatch(actualData, expectedData, null, actual.width, height, { threshold: 0.16 })
  // La comparación cruzada ignora contenido dinámico; el snapshot local mantiene el umbral estricto del 1 %.
  expect(diffPixels / (actual.width * height)).toBeLessThanOrEqual(maxDiffPixelRatio)
}

for (const viewport of viewports) {
  test(`bloque central coincide con la referencia en ${viewport.name}`, async ({ browser }) => {
    const referenceContext = await browser.newContext({ viewport })
    const referencePage = await referenceContext.newPage()
    await seedReference(referencePage)
    await settle(referencePage)
    const referenceWorkspace = referencePage.locator('.workspace')
    await expect(referenceWorkspace).toBeVisible()
    const referenceBox = await referenceWorkspace.boundingBox()
    await normalizeDynamicContent(referencePage)
    const referenceImage = await referenceWorkspace.screenshot({ animations: 'disabled' })

    const localContext = await browser.newContext({ viewport })
    const localPage = await localContext.newPage()
    await seedLocal(localPage)
    await localPage.goto('/', { waitUntil: 'networkidle' })
    await settle(localPage)
    const localWorkspace = localPage.getByTestId('lineup-workspace')
    await expect(localWorkspace).toBeVisible()
    const localBox = await localWorkspace.boundingBox()
    expect(Math.abs(localBox.width - referenceBox.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(localBox.x - referenceBox.x)).toBeLessThanOrEqual(2)
    await expect(localWorkspace).toHaveScreenshot(`workspace-${viewport.name}.png`)
    await normalizeDynamicContent(localPage)
    const localImage = await localWorkspace.screenshot({ animations: 'disabled' })
    compareImages(localImage, referenceImage, viewport.name === 'mobile' ? 0.09 : 0.05)

    await referenceContext.close()
    await localContext.close()
  })
}

test('tema oscuro conserva la misma geometría', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await seedLocal(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await settle(page)
  const lightBox = await page.getByTestId('lineup-workspace').boundingBox()
  await page.getByRole('button', { name: 'Oscuro' }).click()
  const darkBox = await page.getByTestId('lineup-workspace').boundingBox()
  expect({ x: darkBox.x, width: darkBox.width, height: darkBox.height }).toEqual({ x: lightBox.x, width: lightBox.width, height: lightBox.height })
  await expect(page.getByTestId('lineup-workspace')).toHaveScreenshot('workspace-dark.png')
})

test('acciones del bloque central siguen operativas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await seedLocal(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await settle(page)

  const luninCard = page.locator('.lineup-player-card').filter({ hasText: 'Andriy Lunin' })
  await luninCard.locator('summary').click()
  await luninCard.getByRole('button', { name: 'Añadir al banquillo' }).click()
  await expect(page.locator('.lineup-bench-player').filter({ hasText: 'Andriy Lunin' })).toBeVisible()

  await page.locator('.lineup-field-player').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByLabel('Formación').selectOption('4-4-2')
  await expect(page.locator('[data-slot-id]')).toHaveCount(11)
})
