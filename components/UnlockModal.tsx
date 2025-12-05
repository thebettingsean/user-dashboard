'use client'

import React, { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

interface UnlockModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UnlockModal({ isOpen, onClose }: UnlockModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  console.log('🎯 UnlockModal render - isOpen:', isOpen)

  if (!isOpen) return null

  const subscriptionPlans = [
    { 
      id: 'monthly', 
      price: '$99', 
      period: '/month',
      priceId: 'price_1SIZoN07WIhZOuSIm8hTDjy4',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4'
    },
    { 
      id: '6month', 
      price: '$299', 
      period: '/6 months',
      priceId: 'price_1SIZp507WIhZOuSIFMzU7Kkm',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm'
    }
  ]

  const isSubscriptionSelected = ['monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    if (selectedPlan === 'credits') {
      // One-time credit purchase - create checkout session via API
      try {
        const response = await fetch('/api/purchase-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (response.ok && data.url) {
          window.location.href = data.url
        } else {
          console.error('Failed to create checkout session:', data.error)
          alert('Failed to start checkout. Please try again.')
        }
      } catch (error) {
        console.error('Error creating checkout session:', error)
        alert('Failed to start checkout. Please try again.')
      }
    } else {
      // Navigate to subscription checkout
      const plan = subscriptionPlans.find(p => p.id === selectedPlan)
      if (plan) {
        window.location.href = plan.checkoutUrl
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-slate-700/50">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Unlock Premium Access
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Get instant access to expert picks and advanced analytics
          </p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          {/* One-time purchase card */}
          <button
            onClick={() => setSelectedPlan('credits')}
            className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedPlan === 'credits'
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm font-medium mb-1">
                  15 Credits - One Time Purchase
                </div>
                <div className="flex items-baseline mb-2">
                  <span className="text-3xl font-bold text-white">$10</span>
                </div>
                <div className="text-sm text-slate-400">
                  Spend credits on scripts, picks & more!
                </div>
              </div>
              {selectedPlan === 'credits' && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>
              )}
            </div>
          </button>

          {/* Subscription card */}
          <div
            className={`rounded-xl border-2 transition-all duration-200 ${
              isSubscriptionSelected
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : 'border-slate-700 bg-slate-800/30'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white text-lg font-semibold">
                  Unlimited Credits & Access
                </div>
                {isSubscriptionSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                )}
              </div>

              {/* Subscription options */}
              <div className="space-y-2">
                {subscriptionPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-3 rounded-lg transition-all duration-200 text-left ${
                      selectedPlan === plan.id
                        ? 'bg-slate-700/50'
                        : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{plan.price}</span>
                        <span className="text-sm text-slate-400">{plan.period}</span>
                      </div>
                      <span className="text-slate-500">›</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Features dropdown - only shown when subscription selected */}
              {isSubscriptionSelected && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="text-slate-200 text-sm font-medium">Unlimited Credits</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="text-slate-200 text-sm font-medium">Daily Insider Picks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="text-slate-200 text-sm font-medium">All betting data</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <button
            disabled={!selectedPlan}
            onClick={handleContinue}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
              selectedPlan
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25'
                : 'bg-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            {selectedPlan === 'credits' 
              ? 'Continue for $10' 
              : selectedPlan === 'monthly'
              ? 'Continue for $99'
              : selectedPlan === '6month'
              ? 'Continue for $299'
              : 'Select a Plan'}
          </button>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-500">
            Secure payment • Cancel anytime • Instant access
          </div>
        </div>
      </div>
    </div>
  )
}

