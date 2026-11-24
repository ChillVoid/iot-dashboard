import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ArrowUpRight, ChevronDown, X, Layers3, Info, Check, Search, Plus } from './icons'

export function Logo({ compact = false, destination = '/admin/overview' }) {
  return (
    <Link
      to={destination}
      className={`brand ${compact ? 'compact' : ''}`}
      aria-label="Stack Moko Baby"
    >
      <span className="brand-mark" aria-hidden="true">
        <Layers3 size={29} />
      </span>
      {!compact && (
        <span>
          stack moko baby<span className="brand-period">.</span>
        </span>
      )}
    </Link>
  )
}
export function IconButton({ children, label, className = '', ...props }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`icon-button tw:flex tw:items-center tw:justify-center tw:disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={8}>
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
export function Badge({ children, tone = 'neutral', dot = false, className = '', ...props }) {
  return (
    <span className={`badge ${tone} ${className}`.trim()} {...props}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  )
}
export function Card({ children, className = '', ...props }) {
  return (
    <section className={`card tw:min-w-0 ${className}`} {...props}>
      {children}
    </section>
  )
}
export function CardHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="card-heading tw:flex tw:items-center tw:justify-between">
      <div className="card-title-wrap tw:flex tw:min-w-0 tw:items-center">
        {Icon && (
          <span className="heading-icon tw:shrink-0">
            <Icon size={23} strokeWidth={1.6} />
          </span>
        )}
        <div className="tw:min-w-0">
          <h2>{title}</h2>
          {subtitle && <p className="tw:text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
export function RoundLink({ to, label }) {
  return (
    <Link className="circle-link" to={to} aria-label={label}>
      <ArrowUpRight size={22} />
    </Link>
  )
}
// A ripple from the press point (design canvas: 520 ms, 25% of the text colour). It is added
// outside React's children so it never disturbs rendering, and skipped for reduced motion.
export function pressRipple(event) {
  const button = event.currentTarget
  if (button.disabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const box = button.getBoundingClientRect()
  const size = Math.max(box.width, box.height)
  const ripple = document.createElement('span')
  ripple.setAttribute('aria-hidden', 'true')
  ripple.className =
    'tw:pointer-events-none tw:absolute tw:rounded-full tw:bg-current tw:opacity-25 tw:animate-ripple'
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - box.left - size / 2}px;top:${event.clientY - box.top - size / 2}px`
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
  button.appendChild(ripple)
}
export function Button({ children, tone = 'dark', className = '', onPointerDown, ...props }) {
  return (
    <button
      type="button"
      className={`button ${tone} tw:relative tw:overflow-hidden tw:inline-flex tw:items-center tw:justify-center tw:font-sans tw:disabled:cursor-not-allowed tw:motion-safe:transition-[transform,background-color,color,box-shadow] tw:motion-safe:duration-[120ms] tw:motion-safe:ease-snappy tw:motion-safe:enabled:active:scale-[0.97] ${className}`}
      onPointerDown={(event) => {
        pressRipple(event)
        onPointerDown?.(event)
      }}
      {...props}
    >
      {children}
    </button>
  )
}
export function PageHeading({
  eyebrow = 'ACS CARNIVAL / EVENT OPERATIONS',
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div className="tw:min-w-0">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions tw:flex tw:max-w-full tw:flex-wrap tw:items-center">
        {children}
      </div>
    </div>
  )
}
export function Menu({ label, value, options, onChange, icon: Icon, className = '' }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button className={`select-button ${className}`} aria-label={label}>
          {Icon && <Icon size={16} />}
          <span>{value}</span>
          <ChevronDown size={15} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="dropdown" sideOffset={8} align="end">
          <Dropdown.Label className="dropdown-label">{label}</Dropdown.Label>
          {options.map((option) => (
            <Dropdown.Item
              key={option.value}
              className="dropdown-item"
              onSelect={() => onChange(option.value)}
            >
              {option.label}
              {option.label === value && <Check size={15} />}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}
export function Modal({ title, description, trigger, children, open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay tw:motion-safe:animate-fade-in" />
        <Dialog.Content className="modal tw:motion-safe:animate-modal-in">
          <Dialog.Close className="modal-close" aria-label="Close dialog">
            <X size={22} />
          </Dialog.Close>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Layers3,
  headingAs: Heading = 'h2',
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={32} />
      </span>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function InfoNote({ children, className = '' }) {
  return (
    <div className={`info-note tw:flex tw:items-start tw:gap-2 tw:text-note ${className}`}>
      <Info size={17} />
      <span>{children}</span>
    </div>
  )
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search player or code',
  label = 'Search players',
}) {
  return (
    <label className="search-field">
      <Search size={18} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}>
          <X size={16} />
        </button>
      )}
    </label>
  )
}
export function Metric({ label, value, detail, icon: Icon, accent = false }) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metric-label">
        {label}
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  )
}
export function Avatar({ name, index = 0 }) {
  return (
    <span className={`avatar avatar-${index % 4}`} aria-hidden="true">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}
export function FormatNumber({ value, suffix = '' }) {
  return value == null
    ? 'N/A'
    : `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })}${suffix}`
}
export function StepLabel({ number, children }) {
  return (
    <span className="step-label">
      <span>{number}</span>
      {children}
    </span>
  )
}
