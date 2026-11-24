import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Overview from './Overview'

const app = vi.hoisted(() => ({ value: {} }))
vi.mock('../components/charts', () => ({ ActivityChart: () => null, LevelChart: () => null }))
vi.mock('../components/LiveRound', () => ({
  default: () => null,
  stateLabels: { ready: 'Ready', offline: 'Offline' },
}))
vi.mock('../components/Shell', () => ({ RegistrationQR: () => null }))
vi.mock('../state/AppContext', () => ({ useApp: () => app.value }))

const base = {
  stats: { games: 0, players: 0, winRate: null, wins: 0, accuracy: null },
  rounds: [],
  admissionsOpen: true,
  busy: false,
  currentPlayer: null,
}

it('calls the next player from the status strip only when the screen is ready', async () => {
  const callNext = vi.fn()
  const queue = [{ id: 'q1', nickname: 'Mika', code: 'SMB-7Q2K' }]
  app.value = { ...base, queue, machineState: 'offline', callNext }
  const { rerender } = render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Control' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Call next player' })).toBeDisabled()
  app.value = { ...base, queue, machineState: 'ready', callNext }
  rerender(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await userEvent.setup().click(screen.getByRole('button', { name: 'Call next player' }))
  expect(callNext).toHaveBeenCalledOnce()
  expect(
    screen.getByText('No round in progress. Call the next player when the game screen is ready.'),
  ).toBeInTheDocument()
})
