import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Overview from './Overview'

vi.mock('../components/charts', () => ({ ActivityChart: () => null, LevelChart: () => null }))
vi.mock('../components/LiveRound', () => ({
  default: () => null,
  stateLabels: { ready: 'Ready', offline: 'Offline' },
}))
vi.mock('../components/Shell', () => ({ RegistrationQR: () => null }))
vi.mock('../state/AppContext', () => ({
  useApp: () => ({
    stats: { games: 2, players: 2, winRate: 50, wins: 1, accuracy: 75 },
    queue: [],
    admissionsOpen: true,
    rounds: [
      {
        id: 'sim',
        code: 'SMB-SIM',
        nickname: 'Synthetic Simulator',
        source: 'simulator',
        score: 1500,
        level: 12,
        duration: 8,
        completedAt: '2026-11-19T00:00:00Z',
      },
      {
        id: 'device',
        code: 'SMB-DEVICE',
        nickname: 'Synthetic Device',
        source: 'device',
        score: 375,
        level: 3,
        duration: 4,
        completedAt: '2026-11-19T00:00:01Z',
      },
    ],
  }),
}))

it('ranks within the explicitly selected result source', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  expect(screen.getByText('Synthetic Simulator')).toBeInTheDocument()
  expect(screen.queryByText('Synthetic Device')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Leaderboard result source' }))
  await user.click(screen.getByRole('menuitem', { name: 'Game screen / cabinet' }))
  expect(screen.getByText('Synthetic Device')).toBeInTheDocument()
  expect(screen.queryByText('Synthetic Simulator')).not.toBeInTheDocument()
})
