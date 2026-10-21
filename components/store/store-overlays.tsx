'use client'

import Image from 'next/image'
import { Lock, Sparkles, Trash2 } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { AgentTag, Stars } from '@/components/agent/agent-tag'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { PRODUCT_BY_ID, formFactorLabel } from '@/lib/catalog'

export function CartDrawer() {
  const agent = useAgent()
  const { cart, cartOpen } = agent.state
  const subtotal = cart.reduce((a, c) => a + PRODUCT_BY_ID[c.productId].price * c.qty, 0)

  return (
    <Modal open={cartOpen} onClose={() => agent.setCartOpen(false)} title="Your cart" side="right">
      <div className="flex h-full flex-col">
        {cart.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Your cart is empty.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {cart.map((item) => {
              const p = PRODUCT_BY_ID[item.productId]
              return (
                <li key={item.key} className="flex gap-3 p-4">
                  <Image src={p.image || '/placeholder.svg'} alt={p.name} width={72} height={72} className="rounded-lg bg-muted" />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.color} · Qty {item.qty}
                    </span>
                    {item.addedBy === 'agent' ? (
                      <AgentTag className="self-start">Added by assistant, with your OK</AgentTag>
                    ) : (
                      <span className="text-xs text-muted-foreground">Added by you</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-semibold">${p.price * item.qty}</span>
                    <button
                      type="button"
                      onClick={() => agent.removeFromCart(item.key)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-auto flex flex-col gap-3 border-t p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">${subtotal}</span>
          </div>
          <Button size="lg" disabled className="w-full">
            <Lock />
            Checkout
          </Button>
          <p className="text-center text-xs text-muted-foreground">Purchasing is disabled in this prototype.</p>
        </div>
      </div>
    </Modal>
  )
}

export function QuickView() {
  const agent = useAgent()
  const { quickViewId, brief } = agent.state
  const p = quickViewId ? PRODUCT_BY_ID[quickViewId] : null

  return (
    <Modal open={!!p} onClose={() => agent.setQuickView(null)} title={p?.name ?? ''} description={p?.blurb}>
      {p && (
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            <Image src={p.image || '/placeholder.svg'} alt={p.name} fill sizes="320px" className="object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-semibold">${p.price}</span>
              <Stars rating={p.rating} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ['Type', formFactorLabel(p.formFactor)],
                ['Battery', `${p.specs.battery} h`],
                ['Noise cancelling', `${p.specs.anc}/10`],
                ['Sound', `${p.specs.sound}/10`],
                ['Call quality', `${p.specs.mic}/10`],
                ['Comfort', `${p.specs.comfort}/10`],
                ['Weight', `${p.specs.weight} g`],
                ['Water rating', p.specs.water],
                ['Multipoint', p.specs.multipoint ? 'Yes' : 'No'],
                ['Codec', p.specs.codec],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex flex-col gap-2">
              <Button size="lg" onClick={() => agent.addToCart(p.id)}>
                Add to cart
              </Button>
              {brief && (
                <Button size="lg" variant="outline" onClick={() => agent.askAbout(p.id)}>
                  <Sparkles />
                  Ask assistant how this fits my brief
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
