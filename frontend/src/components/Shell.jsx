import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { QrCode, X, Check, ChevronRight, Menu as MenuIcon } from './icons'
import { Logo, IconButton, Modal, Badge } from './ui'
import { useApp } from '../state/AppContext'
import { ThemeSwitch } from '../pages/AdminLogin'
import AdminAssistant from './AdminAssistant'
import { AssistantProvider } from '../state/AssistantContext'
import UpdateStatus from './UpdateStatus'
import { gameLabel } from '../state/game'

// Left rail navigation (design canvas "Stack Moko Baby Admin & Game Screen", round 2/3).
// Monochrome like before; Font Awesome icons with a text label under each.
const tabs = [
  ['overview', 'Overview', 'gauge-high'],
  ['analytics', 'Analytics', 'chart-simple'],
  ['queue', 'Queue', 'list-ol'],
  ['sessions', 'Sessions', 'clock-rotate-left'],
  ['machines', 'Machine', 'display'],
  ['settings', 'Settings', 'gear'],
]
const railLink =
  'tw:flex tw:w-[72px] tw:flex-col tw:items-center tw:gap-1 tw:rounded-[14px] tw:py-2.5 tw:text-[11px] tw:font-semibold tw:text-muted tw:no-underline tw:motion-safe:transition-[background-color,color,transform] tw:motion-safe:duration-[120ms] tw:motion-safe:ease-snappy tw:motion-safe:active:scale-[0.96] tw:hover:bg-surface-soft tw:hover:text-ink'
const railActive = 'tw:bg-surface-soft tw:font-bold tw:text-ink'
const sheetLink =
  'tw:flex tw:min-h-12 tw:items-center tw:gap-3 tw:rounded-[14px] tw:px-4 tw:text-[15px] tw:font-semibold tw:text-ink tw:no-underline tw:hover:bg-surface-soft'
export function RegistrationQR() {
  const { qrPath } = useApp()
  const canvas = useRef(null)
  const [base, setBase] = useState(import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin)
  const url = (() => {
    try {
      const u = new URL(base)
      return ['http:', 'https:'].includes(u.protocol) && qrPath
        ? new URL(qrPath, u.origin).href
        : null
    } catch {
      return null
    }
  })()
  function download() {
    const image = canvas.current?.querySelector('canvas')
    if (!image) return
    const link = document.createElement('a')
    link.href = image.toDataURL('image/png')
    link.download = 'stack-moko-baby-registration-qr.png'
    link.click()
  }
  return (
    <Modal
      title="Scan. Register. Stack."
      description="Player entry · ACS Carnival · Cabinet 01"
      trigger={
        <button className="button light qr-trigger">
          <QrCode size={17} />
          <span>Registration QR</span>
        </button>
      }
    >
      <div className="qr-wrap" ref={canvas}>
        {url ? (
          <QRCodeCanvas
            value={url}
            size={480}
            level="M"
            marginSize={4}
            title="Scan to join the player queue"
          />
        ) : (
          <p>The event QR is unavailable.</p>
        )}
      </div>
      <label className="field-label" htmlFor="event-url">
        Event website address
      </label>
      <input
        className="text-input"
        id="event-url"
        type="url"
        value={base}
        onChange={(e) => setBase(e.target.value)}
      />
      <p className="field-help">
        Use the address players can reach on carnival Wi-Fi. A localhost QR works only on this
        computer. Use HTTPS for real registrations. Players choose Use camera or Upload QR image on
        the scan page. Configure this address as STACK_PUBLIC_URL or STACK_ALLOWED_ORIGINS in the
        backend before sharing a new hostname.
      </p>
      {url && (
        <div className="modal-actions">
          <button className="button light" onClick={download}>
            Download QR
          </button>
          <a className="button dark" href={url} target="_blank" rel="noreferrer">
            Test player entry
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </div>
      )}
    </Modal>
  )
}
export default function Shell() {
  const { pathname } = useLocation()
  const [mobileNav, setMobileNav] = useState(false)
  const { toast, setToast, logout, admin, machine, game } = useApp()
  useEffect(() => {
    setMobileNav(false)
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 7000)
    return () => clearTimeout(t)
  }, [toast, setToast])
  const role = admin.role === 'admin' ? 'Administrator' : 'Operator'
  const signOut = () => logout().catch((e) => setToast(e.message))
  return (
    <AssistantProvider>
      <div className="admin-frame tw:min-h-screen tw:lg:pl-[96px]">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <nav
          aria-label="Main navigation"
          className="tw:fixed tw:inset-y-0 tw:left-0 tw:z-30 tw:hidden tw:w-[96px] tw:flex-col tw:items-center tw:gap-1.5 tw:border-r tw:border-solid tw:border-line tw:bg-surface tw:py-5 tw:lg:flex"
        >
          <Link
            to="/admin/overview"
            aria-label="Stack Moko Baby"
            className="tw:mb-4 tw:grid tw:size-11 tw:place-items-center tw:rounded-[14px] tw:bg-ink tw:text-surface"
          >
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
          </Link>
          {tabs.map(([path, label, icon]) => (
            <NavLink
              to={`/admin/${path}`}
              key={path}
              className={({ isActive }) => `${railLink} ${isActive ? railActive : ''}`}
            >
              <i className={`fa-solid fa-${icon} tw:text-[18px]`} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <div className="tw:mt-auto tw:flex tw:flex-col tw:items-center tw:gap-2">
            <ThemeSwitch />
            <span
              className="operator-avatar"
              title={`${admin.username} · ${role}`}
              aria-label={`Signed in as ${admin.username}, ${role.toLowerCase()}`}
            >
              {admin.role === 'admin' ? 'AD' : 'OP'}
            </span>
            <IconButton label="Sign out" onClick={signOut}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            </IconButton>
          </div>
        </nav>

        <header className="tw:sticky tw:top-0 tw:z-30 tw:flex tw:h-16 tw:items-center tw:gap-3 tw:border-b tw:border-solid tw:border-line tw:bg-surface tw:px-4 tw:lg:hidden">
          <Logo />
          <div className="tw:ml-auto tw:flex tw:items-center tw:gap-2">
            <ThemeSwitch />
            <IconButton
              label={mobileNav ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X size={21} /> : <MenuIcon size={21} />}
            </IconButton>
          </div>
        </header>
        {mobileNav && (
          <nav
            aria-label="Main navigation"
            className="tw:fixed tw:inset-x-3 tw:top-[68px] tw:z-30 tw:grid tw:gap-1 tw:rounded-[22px] tw:border tw:border-solid tw:border-line tw:bg-surface tw:p-2 tw:shadow-[0_18px_48px_rgba(0,0,0,.14)] tw:lg:hidden tw:origin-top tw:motion-safe:animate-panel-in"
          >
            {tabs.map(([path, label, icon]) => (
              <NavLink
                to={`/admin/${path}`}
                key={path}
                className={({ isActive }) => `${sheetLink} ${isActive ? 'tw:bg-surface-soft' : ''}`}
              >
                <i className={`fa-solid fa-${icon} tw:w-5 tw:text-center`} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              className={`${sheetLink} tw:w-full tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-left tw:font-sans`}
              onClick={signOut}
            >
              <i
                className="fa-solid fa-right-from-bracket tw:w-5 tw:text-center"
                aria-hidden="true"
              />
              Sign out ({admin.username})
            </button>
          </nav>
        )}

        <div className="tw:mx-auto tw:w-full tw:max-w-[1440px] tw:px-4 tw:pb-16 tw:sm:px-6 tw:lg:px-10">
          <div className="scope-bar">
            <span>
              <span className="scope-dot" />
              ACS Carnival
              <ChevronRight size={13} />
              <span>{gameLabel(game)}</span>
            </span>
            <Badge tone="soft">
              {machine.health?.source === 'simulator'
                ? 'Simulator active'
                : (machine.firmware || '').startsWith('web-screen')
                  ? 'Web game screen'
                  : 'Database connected'}
            </Badge>
          </div>
          <main
            id="main-content"
            key={pathname}
            className="main-content tw:motion-safe:animate-fade-in"
          >
            <Outlet />
          </main>
          <footer className="app-footer">
            <Logo compact />
            <span>Stack Moko Baby · Event operations</span>
            <UpdateStatus />
          </footer>
        </div>
        <AdminAssistant onReviewPage={pathname === '/admin/question-review'} />
        {toast && (
          <div key={toast} className="toast tw:motion-safe:animate-toast-in" role="status">
            <Check size={19} />
            <span>{toast}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast('')}>
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </AssistantProvider>
  )
}
