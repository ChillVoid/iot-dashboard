import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2,
  UsersRound,
  Trophy,
  Target,
  ArrowRight,
  Sparkles,
  MoreHorizontal,
  Plus,
  Layers3,
  ListOrdered,
  ChevronRight,
} from '../components/icons'
import { Card, CardHeader, Badge, RoundLink, Avatar, Menu, Button } from '../components/ui'
import { ActivityChart, LevelChart } from '../components/charts'
import { stateLabels } from '../components/LiveRound'
import PlayerList from '../components/PlayerList'
import { RegistrationQR } from '../components/Shell'
import { useApp } from '../state/AppContext'
import { rankPlayers } from '../data/demo'
import { CLASSIC_GAME, gameLabel } from '../state/game'

export default function Overview() {
  const {
    stats,
    rounds,
    queue,
    admissionsOpen,
    machineState,
    currentPlayer,
    callNext,
    busy,
    game = CLASSIC_GAME,
  } = useApp()
  const [rankingSource, setRankingSource] = useState('simulator')
  const metrics = [
    {
      label: 'Games played',
      value: stats.games,
      detail: 'saved completed rounds',
      icon: Gamepad2,
      to: '/admin/sessions',
    },
    {
      label: 'Players on the board',
      value: stats.players,
      detail: 'unique players with results',
      icon: UsersRound,
      to: '/admin/sessions',
    },
    {
      label: 'Win rate',
      value: stats.winRate == null ? '—' : `${stats.winRate.toFixed(1)}%`,
      detail: `${stats.wins} wins out of ${stats.games} rounds`,
      icon: Trophy,
      to: '/admin/analytics',
    },
    {
      label: 'Placement accuracy',
      value: stats.accuracy == null ? '—' : `${stats.accuracy.toFixed(1)}%`,
      detail: 'pooled overlap ratio',
      icon: Target,
      to: '/admin/analytics',
    },
  ]
  return (
    <>
      {/* Control: the line is the work (design canvas "Stack Moko Baby Admin & Game Screen"). */}
      <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4">
        <div>
          <span className="eyebrow">
            ACS Carnival · {gameLabel(game)} · {game.levels} levels
          </span>
          <h1 className="tw:mt-1 tw:mb-0 tw:text-[32px] tw:font-extrabold tw:tracking-[-0.02em]">
            Control
          </h1>
        </div>
        <RegistrationQR />
      </div>
      <Card className="tw:mb-5 tw:flex tw:flex-wrap tw:items-center tw:gap-x-8 tw:gap-y-4 tw:px-6 tw:py-4 tw:motion-safe:animate-fade-up">
        <Badge dot>{stateLabels[machineState] || machineState}</Badge>
        <div>
          <span className="eyebrow">In line</span>
          <strong className="tw:block tw:text-[24px] tw:font-extrabold tw:tabular-nums">
            {queue.length}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Wait now</span>
          <strong className="tw:block tw:text-[24px] tw:font-extrabold tw:tabular-nums">
            {queue.length ? `~${Math.ceil(queue.length * 1.5)} min` : '—'}
          </strong>
        </div>
        <div className="tw:min-w-0">
          <span className="eyebrow">Up next</span>
          <strong className="tw:block tw:truncate tw:text-[18px] tw:font-extrabold">
            {queue[0] ? (
              <>
                {queue[0].nickname}{' '}
                <span className="tw:text-[14px] tw:font-semibold tw:text-muted">
                  {queue[0].code}
                </span>
              </>
            ) : (
              'Nobody waiting'
            )}
          </strong>
        </div>
        <Button
          className="tw:ml-auto tw:min-h-14 tw:min-w-[220px] tw:text-[16px] tw:max-sm:w-full"
          disabled={machineState !== 'ready' || !queue.length || !admissionsOpen || busy}
          onClick={callNext}
        >
          {busy ? 'Calling…' : 'Call next player'}
        </Button>
      </Card>
      <div className="tw:mb-2 tw:grid tw:gap-5 tw:lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="tw:motion-safe:animate-fade-up tw:motion-safe:[animation-delay:60ms]">
          <CardHeader
            title="The line"
            subtitle={`${queue.length} ${queue.length === 1 ? 'player' : 'players'} waiting · first come, first served`}
            icon={ListOrdered}
            action={
              <Badge tone="soft" dot>
                {admissionsOpen ? 'Admissions open' : 'Paused'}
              </Badge>
            }
          />
          <div className="queue-preview">
            {queue.slice(0, 5).map((p, i) => (
              <div className="queue-preview-row" key={p.id}>
                <span className="queue-number">{String(i + 1).padStart(2, '0')}</span>
                <Avatar name={p.nickname} index={i} />
                <div className="player-info">
                  <strong>{p.nickname}</strong>
                  <span>{p.code}</span>
                </div>
                <span className="queue-wait">{i === 0 ? 'Up next' : 'Waiting'}</span>
              </div>
            ))}
            {!queue.length && (
              <p className="subtle">No one waiting. A good time for a fresh challenger.</p>
            )}
          </div>
          <Link className="card-bottom-link" to="/admin/queue">
            Manage the line: skip, no-show, re-entry
            <ArrowRight size={17} />
          </Link>
        </Card>
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-5">
          <section
            aria-label="Now playing"
            className="tw:rounded-[26px] tw:bg-ink tw:p-6 tw:text-surface tw:motion-safe:animate-fade-up tw:motion-safe:[animation-delay:120ms]"
          >
            <span className="eyebrow tw:text-surface">Now playing</span>
            {currentPlayer ? (
              <>
                <strong className="tw:mt-3 tw:block tw:text-[22px]">
                  {currentPlayer.nickname} · {currentPlayer.code}
                </strong>
                <p className="tw:mt-2 tw:mb-0 tw:text-[14px] tw:text-surface">
                  {currentPlayer.status === 'playing'
                    ? 'Round in progress on the game screen.'
                    : currentPlayer.status === 'review'
                      ? 'Round held: open Machine to resolve it.'
                      : 'Called: waiting for the button press.'}
                </p>
              </>
            ) : (
              <p className="tw:mt-3 tw:mb-0 tw:text-[15px] tw:text-surface">
                No round in progress. Call the next player when the game screen is ready.
              </p>
            )}
          </section>
          <Card className="overview-card tw:motion-safe:animate-fade-up tw:motion-safe:[animation-delay:180ms]">
            <CardHeader
              title="Today"
              subtitle="The numbers behind the fun"
              icon={Sparkles}
              action={<RoundLink to="/admin/analytics" label="Explore game analytics" />}
            />
            <div className="metric-rows">
              {metrics.map(({ label, value, detail, icon: Icon, to }) => (
                <Link className="metric-row" key={label} to={to}>
                  <span className="metric-row-icon">
                    <Icon size={26} strokeWidth={1.45} />
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <span>{detail}</span>
                  </div>
                  <b>{value}</b>
                  <ChevronRight size={19} />
                </Link>
              ))}
            </div>
            <div className="overview-bottom">
              <span className="tiny-dot" />
              {gameLabel(game)} · {game.round_limit_ms / 1000} seconds · {game.levels} levels
              <span>Current rules · all saved sources</span>
            </div>
          </Card>
        </div>
      </div>
      <div className="section-label">
        <span>BEHIND EVERY GREAT STACK</span>
        <Link to="/admin/analytics">
          Explore analytics
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="two-column">
        <ActivityChart rounds={rounds} />
        <LevelChart rounds={rounds} levels={game.levels} />
      </div>
      <div className="lower-grid">
        <Card>
          <CardHeader
            title="The high stack"
            subtitle="Best saved round per player · selected source"
            icon={Trophy}
            action={
              <Menu
                label="Leaderboard result source"
                value={rankingSource === 'simulator' ? 'Simulator' : 'Game screen / cabinet'}
                options={[
                  { value: 'simulator', label: 'Simulator' },
                  { value: 'device', label: 'Game screen / cabinet' },
                ]}
                onChange={setRankingSource}
              />
            }
          />
          <PlayerList
            compact
            players={rankPlayers(rounds.filter((round) => round.source === rankingSource)).slice(
              0,
              4,
            )}
          />
          {!rounds.some((round) => round.source === rankingSource) && (
            <p className="subtle">No saved results for this source.</p>
          )}
          <Link className="card-bottom-link" to="/admin/sessions">
            View saved round history
            <ArrowRight size={17} />
          </Link>
        </Card>
      </div>
    </>
  )
}
