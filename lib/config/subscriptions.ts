// lib/config/subscriptions.ts
// New entitlement-based subscription architecture

// =============================================================================
// ENTITLEMENTS - These are what users "have access to"
// Pages check entitlements, NOT price IDs
// =============================================================================
export type Entitlement = 'picks' | 'publicBetting' | 'builder'

export interface UserEntitlements {
  picks: boolean
  publicBetting: boolean
  builder: boolean
}

export const DEFAULT_ENTITLEMENTS: UserEntitlements = {
  picks: false,
  publicBetting: false,
  builder: false,
}

// =============================================================================
// PRODUCTS - Each product grants ONE entitlement
// =============================================================================
export interface ProductConfig {
  id: string
  name: string
  description: string
  entitlement: Entitlement
  standalone: {
    priceId: string
    price: number // in dollars
  }
  addon: {
    priceId: string
    price: number // discounted price when bundled
  }
  features: string[]
}

export const PRODUCTS: Record<string, ProductConfig> = {
  picks: {
    id: 'picks',
    name: 'Analyst Picks',
    description: 'Daily picks and analysis from our expert analysts',
    entitlement: 'picks',
    standalone: {
      priceId: 'price_1Sj8AO07WIhZOuSInXia99Te',
      price: 29.99,
    },
    addon: {
      priceId: 'price_1SkrtH07WIhZOuSIdBoU3Qt5',
      price: 19.99,
    },
    features: [
      'Daily expert picks across all sports',
      'Detailed analysis and write-ups',
      'Discord alerts for live picks',
      'Full analyst history and stats',
    ],
  },
  publicBetting: {
    id: 'publicBetting',
    name: 'Public Betting',
    description: 'Real-time betting splits and market indicators',
    entitlement: 'publicBetting',
    standalone: {
      priceId: 'price_1Sj89V07WIhZOuSIgHUFQkVi',
      price: 19.99,
    },
    addon: {
      priceId: 'price_1Skrsf07WIhZOuSIsl0Wxd8G',
      price: 9.99,
    },
    features: [
      'Public betting splits from 150+ sportsbooks',
      'Line movement tracking',
      'Market indicators (Public/Vegas/Whale)',
      'All sports, all seasons',
    ],
  },
  // Future: Builder product
  // builder: {
  //   id: 'builder',
  //   name: 'System Builder',
  //   description: 'Build and backtest betting systems',
  //   entitlement: 'builder',
  //   standalone: { priceId: 'price_xxx', price: 19.99 },
  //   addon: { priceId: 'price_xxx', price: 9.99 },
  //   features: [...],
  // },
}

// =============================================================================
// PRICE ID → ENTITLEMENT MAPPING
// Used by webhook to determine what entitlements to grant
// =============================================================================
export const PRICE_TO_ENTITLEMENT: Record<string, Entitlement> = {
  // Picks (both standalone and addon grant the same entitlement)
  'price_1Sj8AO07WIhZOuSInXia99Te': 'picks',
  'price_1SkrtH07WIhZOuSIdBoU3Qt5': 'picks',
  
  // Public Betting (both standalone and addon grant the same entitlement)
  'price_1Sj89V07WIhZOuSIgHUFQkVi': 'publicBetting',
  'price_1Skrsf07WIhZOuSIsl0Wxd8G': 'publicBetting',
  
  // Future: Builder
  // 'price_builder_standalone': 'builder',
  // 'price_builder_addon': 'builder',
}

// =============================================================================
// LEGACY PRICE IDS - Grandfathered users get ALL entitlements
// =============================================================================
export const LEGACY_PRICE_IDS = [
  // Old $99 All Access
  'price_1SIZoo07WIhZOuSIJB8OGgVU', // Weekly $29
  'price_1SIZoN07WIhZOuSIm8hTDjy4', // Monthly $99
  'price_1SIZp507WIhZOuSIFMzU7Kkm', // 6-Month $299
  
  // Legacy Insider Advantage
  'price_1SECSt07WIhZOuSIqQoUwbpY',
  'price_1Qw8iY07WIhZOuSIC48z9vlc',
  'price_1QuJos07WIhZOuSIc3iG0Nsi',
  'price_1RdJwP07WIhZOuSIgQKcur3e',
  
  // Legacy Insider Bets
  'price_1R600p07WIhZOuSIrNk4pLau',
  'price_1QuJnw07WIhZOuSIMflqulXj',
  'price_1R5zzf07WIhZOuSIy0Wn2aZF',
  'price_1RdJuK07WIhZOuSIn3UxIt4V',
  
  // Legacy Insider Stats
  'price_1QuJoM07WIhZOuSIERC3Dces',
  'price_1Qw8ha07WIhZOuSI0fVoF8Am',
  'price_1RdJoT07WIhZOuSIvK6yHiOK',
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get entitlements from a list of price IDs (from subscription items)
 */
export function getEntitlementsFromPriceIds(priceIds: string[]): UserEntitlements {
  const entitlements = { ...DEFAULT_ENTITLEMENTS }
  
  for (const priceId of priceIds) {
    // Legacy users get everything
    if (LEGACY_PRICE_IDS.includes(priceId)) {
      return { picks: true, publicBetting: true, builder: true }
    }
    
    // Map price to entitlement
    const entitlement = PRICE_TO_ENTITLEMENT[priceId]
    if (entitlement) {
      entitlements[entitlement] = true
    }
  }
  
  return entitlements
}

/**
 * Check if a price ID is valid (new or legacy)
 */
export function isValidPriceId(priceId: string): boolean {
  return priceId in PRICE_TO_ENTITLEMENT || LEGACY_PRICE_IDS.includes(priceId)
}

/**
 * Get the upsell product for a given primary product
 */
export function getUpsellForProduct(productId: string): ProductConfig | null {
  if (productId === 'picks') return PRODUCTS.publicBetting
  if (productId === 'publicBetting') return PRODUCTS.picks
  // Future: if (productId === 'builder') return multiple upsells
  return null
}

/**
 * Calculate total price for selected products
 */
export function calculateTotal(
  primaryProductId: string,
  includeUpsell: boolean
): { items: { priceId: string; name: string; price: number }[]; total: number } {
  const primary = PRODUCTS[primaryProductId]
  if (!primary) throw new Error(`Invalid product: ${primaryProductId}`)
  
  const items = [
    {
      priceId: primary.standalone.priceId,
      name: primary.name,
      price: primary.standalone.price,
    },
  ]
  
  if (includeUpsell) {
    const upsell = getUpsellForProduct(primaryProductId)
    if (upsell) {
      items.push({
        priceId: upsell.addon.priceId,
        name: upsell.name,
        price: upsell.addon.price,
      })
    }
  }
  
  const total = items.reduce((sum, item) => sum + item.price, 0)
  return { items, total }
}

