'use client'

// Shared Stripe-style checkout modal for demos. Demo mode: fields are read-only
// (the classic 4242 test card) and "paying" just flips to a success state — the
// real builds swap this for a live Stripe Checkout/Elements session.

import { useState } from 'react'
import { Check, Lock, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  title: string
  amount: string
  per?: string
  accent: string
  successNote?: string
}

export default function StripeCheckout({ open, onClose, onSuccess, title, amount, per, accent, successNote }: Props) {
  const [paid, setPaid] = useState(false)
  if (!open) return null

  const border = '1px solid oklch(0.2 0.01 280 / 0.14)'
  const muted = 'oklch(0.5 0.015 280)'

  function close() {
    setPaid(false)
    onClose()
  }

  return (
    <div
      className='fixed inset-0 z-50 grid place-items-center p-4'
      style={{ background: 'oklch(0.15 0.02 280 / 0.55)' }}
      onClick={close}>
      <div
        className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl'
        style={{ color: 'oklch(0.23 0.02 280)' }}
        onClick={(e) => e.stopPropagation()}>
        {!paid ? (
          <>
            <div className='flex items-center justify-between'>
              <p className='text-[15px] font-semibold'>{title}</p>
              <button onClick={close} style={{ color: muted }} aria-label='Close'>
                <X className='h-4 w-4' />
              </button>
            </div>
            <p className='mt-0.5 flex items-center gap-1 text-[12.5px]' style={{ color: muted }}>
              <Lock className='h-3 w-3' /> Powered by Stripe · demo mode, no real charge
            </p>
            <p className='mt-3 text-[24px] font-bold' style={{ letterSpacing: '-0.02em' }}>
              {amount}
              {per && <span className='text-[13px] font-normal' style={{ color: muted }}> {per}</span>}
            </p>
            <div className='mt-3 flex flex-col gap-2.5'>
              <input readOnly value='demo@customer.io' className='rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ border, color: muted, background: 'oklch(0.98 0.003 280)' }} />
              <input readOnly value='4242 4242 4242 4242' className='rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ border, color: muted, background: 'oklch(0.98 0.003 280)', fontFamily: 'var(--font-jetbrains), monospace' }} />
              <div className='flex gap-2.5'>
                <input readOnly value='12 / 29' className='w-1/2 rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ border, color: muted, background: 'oklch(0.98 0.003 280)', fontFamily: 'var(--font-jetbrains), monospace' }} />
                <input readOnly value='424' className='w-1/2 rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ border, color: muted, background: 'oklch(0.98 0.003 280)', fontFamily: 'var(--font-jetbrains), monospace' }} />
              </div>
            </div>
            <button
              onClick={() => { setPaid(true); onSuccess?.() }}
              className='mt-4 w-full rounded-lg py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90'
              style={{ background: accent }}>
              Pay {amount} — demo
            </button>
          </>
        ) : (
          <div className='py-4 text-center'>
            <span className='mx-auto grid h-12 w-12 place-items-center rounded-full' style={{ background: 'oklch(0.6 0.15 155 / 0.12)' }}>
              <Check className='h-6 w-6' style={{ color: 'oklch(0.55 0.15 155)' }} />
            </span>
            <p className='mt-3 text-[16px] font-semibold'>Payment successful</p>
            <p className='mx-auto mt-1 max-w-[30ch] text-[13px]' style={{ color: muted }}>
              {successNote ?? 'In the real build this runs live Stripe with webhooks and receipts.'}
            </p>
            <button onClick={close} className='mt-4 rounded-lg px-4 py-2 text-[13.5px] font-medium' style={{ border }}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
