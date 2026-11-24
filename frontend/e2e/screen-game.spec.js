import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

// Plan B (25 Nov 2026): the stacking game runs on /screen, paired from Settings, and plays
// as the cabinet device. Named to run after matrix.spec.js, because pairing replaces the
// device token that spec uses.
const shots = process.env.STACK_SCREEN_SHOTS

async function shot(page, name) {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) })
}

async function register(browser, qrImage, nickname, studentId) {
  const context = await browser.newContext()
  const player = await context.newPage()
  await player.goto('/scan')
  await player
    .getByLabel('QR code image', { exact: true })
    .setInputFiles({ name: 'game-qr.png', mimeType: 'image/png', buffer: qrImage })
  await expect(player).toHaveURL(/\/register$/)
  await player.getByLabel(/^Nickname/).fill(nickname)
  await player.getByLabel(/^Student ID/).fill(studentId)
  await player.getByRole('checkbox').check()
  await player.getByRole('button', { name: 'Let’s stack' }).click()
  await expect(player).toHaveURL(/\/ticket$/)
  return { context, player }
}

test('the web game screen pairs, plays a ranked round with the keyboard fallback and holds an interrupted one', async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.STACK_TEST_RULESET !== 'matrix-v1',
    'Run with STACK_TEST_RULESET=matrix-v1 and a disposable database.',
  )
  test.setTimeout(180000)
  await page.goto('/admin/login')
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill(process.env.STACK_TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/overview$/)
  await page.getByRole('button', { name: 'Registration QR' }).click()
  const qrImage = Buffer.from(
    await page
      .getByRole('dialog')
      .locator('canvas')
      .evaluate((element) => element.toDataURL('image/png').split(',')[1]),
    'base64',
  )
  await page.getByRole('button', { name: 'Close dialog' }).click()
  const auth = await (await page.request.get('/api/admin/session')).json()
  const callNext = () =>
    page.request.post('/api/admin/queue/call-next', {
      headers: { 'X-CSRF-Token': auth.csrf, 'Idempotency-Key': randomUUID() },
    })

  // Pair this browser from Settings; the game screen opens.
  await page.goto('/admin/settings')
  await page.getByRole('button', { name: 'Use this laptop as the game screen' }).click()
  await page.getByRole('button', { name: 'Pair and open the game screen' }).click()
  await expect(page).toHaveURL(/\/screen$/)
  // Status lives in the Operator sheet now (the side panel became an icon).
  await expect(page.getByText('Waiting for the next player')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Operator menu/ }).click()
  await expect(page.getByText('Server connected')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Keyboard fallback/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Operator' })).toHaveCount(0)
  await expect(page.getByText('Keyboard fallback on (Space)')).toBeVisible()
  await shot(page, 'screen-waiting')

  const first = await register(browser, qrImage, 'Screen Tester', 'SYNTHETIC-SCREEN-01')
  const machine = async () =>
    (await (await page.request.get('/api/admin/snapshot')).json()).machineState
  await expect.poll(async () => await machine(), { timeout: 15000 }).toBe('ready')
  expect((await callNext()).status()).toBe(200)
  await expect(page.getByText('Your turn! Press the button.')).toBeVisible({
    timeout: 15000,
  })
  await shot(page, 'screen-called')

  await page.keyboard.press('Space')
  await expect(page.getByText('GO! Press to stack')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(450)
  await page.keyboard.press('Space')
  await shot(page, 'screen-playing')
  for (let i = 0; i < 150; i += 1) {
    if (await page.getByText(/YOU WIN!|GAME OVER/).isVisible()) break
    await page.waitForTimeout(170 + ((i * 37) % 230))
    await page.keyboard.press('Space')
  }
  await expect(page.getByText(/YOU WIN!|GAME OVER/)).toBeVisible({ timeout: 65000 })
  await expect(page.getByText('Score saved to the leaderboard.')).toBeVisible({ timeout: 15000 })
  await shot(page, 'screen-result')
  const shown = Number(await page.getByTestId('final-score').textContent())
  await expect
    .poll(async () => (await (await first.player.request.get('/api/player/context')).json()).ticket)
    .toMatchObject({ status: 'completed', score: shown })
  await first.context.close()

  // A reload during a round loses the local game: the round is held for the operator.
  const second = await register(browser, qrImage, 'Reload Tester', 'SYNTHETIC-SCREEN-02')
  await expect(page.getByText('Waiting for the next player')).toBeVisible({ timeout: 15000 })
  await expect.poll(async () => await machine(), { timeout: 15000 }).toBe('ready')
  expect((await callNext()).status()).toBe(200)
  await expect(page.getByText('Your turn! Press the button.')).toBeVisible({
    timeout: 15000,
  })
  await page.keyboard.press('Space')
  await expect(page.getByText('GO! Press to stack')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(1500) // the start marker reaches the server
  await page.reload()
  await expect(page.getByText('Round held')).toBeVisible({ timeout: 15000 })
  const snapshot = await (await page.request.get('/api/admin/snapshot')).json()
  expect(snapshot.currentPlayer).toMatchObject({ status: 'review', source: 'device' })
  await second.context.close()
})
