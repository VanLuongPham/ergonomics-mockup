'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  side?: 'center' | 'right'
  className?: string
}

export function Modal({ open, onClose, title, description, children, side = 'center', className }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex', side === 'right' ? 'justify-end' : 'items-center justify-center p-4')}>
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-foreground/40 animate-in fade-in-0"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-full flex-col bg-card text-card-foreground shadow-2xl outline-none',
          side === 'right'
            ? 'h-full w-full max-w-md animate-in slide-in-from-right'
            : 'max-h-[90vh] w-full max-w-2xl rounded-xl animate-in fade-in-0 zoom-in-95',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-base font-semibold text-balance">
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
