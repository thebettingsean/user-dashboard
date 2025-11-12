import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

// Price ID mappings for upgrade paths
const PRICE_MAPPINGS = {
  // Legacy Bets (Grandfathered - All Access)
  'price_1R5zzf07WIhZOuSIy0Wn2aZF': { // Weekly $14.99
    monthly: 'price_1R600p07WIhZOuSIrNk4pLau', // $29.99
    sixMonth: 'price_1RdJuK07WIhZOuSIn3UxIt4V', // $119.99
  },
  'price_1R600p07WIhZOuSIrNk4pLau': { // Monthly $29.99
    sixMonth: 'price_1RdJuK07WIhZOuSIn3UxIt4V', // $119.99
  },
  'price_1QuJnw07WIhZOuSIMflqulXj': { // Monthly 2 $30.00
    sixMonth: 'price_1RdJuK07WIhZOuSIn3UxIt4V', // $119.99
  },
  
  // Legacy Stats (Grandfathered - All Access)
  'price_1Qw8ha07WIhZOuSI0fVoF8Am': { // Weekly $15.00
    monthly: 'price_1QuJoM07WIhZOuSIERC3Dces', // $30.00
    sixMonth: 'price_1RdJoT07WIhZOuSIvK6yHiOK', // $119.99
  },
  'price_1QuJoM07WIhZOuSIERC3Dces': { // Monthly $30.00
    sixMonth: 'price_1RdJoT07WIhZOuSIvK6yHiOK', // $119.99
  },
  
  // Legacy Advantage Old (Grandfathered - All Access)
  'price_1Qw8iY07WIhZOuSIC48z9vlc': { // Weekly $25.00
    monthly: 'price_1QuJos07WIhZOuSIc3iG0Nsi', // $50.00
    sixMonth: 'price_1RdJwP07WIhZOuSIgQKcur3e', // $199.99
  },
  'price_1QuJos07WIhZOuSIc3iG0Nsi': { // Monthly $50.00
    sixMonth: 'price_1RdJwP07WIhZOuSIgQKcur3e', // $199.99
  },
  
  // New Advantage (Current Product - Can Upgrade Duration)
  'price_1SIZoo07WIhZOuSIJB8OGgVU': { // Weekly $29.00
    monthly: 'price_1SIZoN07WIhZOuSIm8hTDjy4', // $99.00
    sixMonth: 'price_1SIZp507WIhZOuSIFMzU7Kkm', // $299.00
  },
  'price_1SIZoN07WIhZOuSIm8hTDjy4': { // Monthly $99.00
    sixMonth: 'price_1SIZp507WIhZOuSIFMzU7Kkm', // $299.00
  },
  
  // Fantasy Standalone (no upgrades available)
  'price_1RyElj07WIhZOuSI4lM0RnqM': {}, // Weekly $4.99
}

// Legacy product IDs (for grandfathered badge)
const LEGACY_PRICE_IDS = [
  'price_1R5zzf07WIhZOuSIy0Wn2aZF',
  'price_1R600p07WIhZOuSIrNk4pLau',
  'price_1QuJnw07WIhZOuSIMflqulXj',
  'price_1RdJuK07WIhZOuSIn3UxIt4V',
  'price_1Qw8ha07WIhZOuSI0fVoF8Am',
  'price_1QuJoM07WIhZOuSIERC3Dces',
  'price_1RdJoT07WIhZOuSIvK6yHiOK',
  'price_1Qw8iY07WIhZOuSIC48z9vlc',
  'price_1QuJos07WIhZOuSIc3iG0Nsi',
  'price_1RdJwP07WIhZOuSIgQKcur3e',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, targetPriceId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user email from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: email, limit: 1 })
    const customer = customers.data[0]

    if (!customer) {
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 })
    }

    // List active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    const subscription = subscriptions.data[0]

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const currentPriceId = subscription.items.data[0].price.id

    // Handle different actions
    if (action === 'checkUpgrades') {
      return await handleCheckUpgrades(subscription, currentPriceId)
    } else if (action === 'applyUpgrade') {
      return await handleApplyUpgrade(subscription, currentPriceId, targetPriceId)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Stripe Upgrade API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

async function handleCheckUpgrades(subscription: Stripe.Subscription, currentPriceId: string) {
  const upgradePaths: any = PRICE_MAPPINGS[currentPriceId as keyof typeof PRICE_MAPPINGS] || {}
  const isLegacy = LEGACY_PRICE_IDS.includes(currentPriceId)

  // Fetch current price details
  const currentPrice = await stripe.prices.retrieve(currentPriceId, {
    expand: ['product'],
  })
  const currentProduct = currentPrice.product as Stripe.Product

  const availableUpgrades: any[] = []

  // Check for monthly upgrade
  if (upgradePaths.monthly) {
    const monthlyPrice = await stripe.prices.retrieve(upgradePaths.monthly, {
      expand: ['product'],
    })
    const currentAmount = currentPrice.unit_amount! / 100
    const monthlyAmount = monthlyPrice.unit_amount! / 100
    const savings = calculateSavings(currentAmount, 'weekly', monthlyAmount, 'monthly')

    availableUpgrades.push({
      type: 'monthly',
      priceId: upgradePaths.monthly,
      name: 'Monthly Plan',
      price: monthlyAmount,
      currency: monthlyPrice.currency,
      savings: savings,
      interval: 'month',
    })
  }

  // Check for 6-month upgrade
  if (upgradePaths.sixMonth) {
    const sixMonthPrice = await stripe.prices.retrieve(upgradePaths.sixMonth, {
      expand: ['product'],
    })
    const currentAmount = currentPrice.unit_amount! / 100
    const sixMonthAmount = sixMonthPrice.unit_amount! / 100
    const currentInterval = currentPrice.recurring?.interval || 'week'
    const savings = calculateSavings(currentAmount, currentInterval, sixMonthAmount, '6-month')

    availableUpgrades.push({
      type: 'sixMonth',
      priceId: upgradePaths.sixMonth,
      name: '6-Month Plan',
      price: sixMonthAmount,
      currency: sixMonthPrice.currency,
      savings: savings,
      interval: '6-month',
    })
  }

  return NextResponse.json({
    currentPlan: {
      name: currentProduct.name,
      price: currentPrice.unit_amount! / 100,
      currency: currentPrice.currency,
      interval: currentPrice.recurring?.interval || 'week',
      isLegacy: isLegacy,
    },
    availableUpgrades: availableUpgrades,
    hasUpgrades: availableUpgrades.length > 0,
  })
}

async function handleApplyUpgrade(
  subscription: Stripe.Subscription,
  currentPriceId: string,
  targetPriceId: string
) {
  const upgradePaths = PRICE_MAPPINGS[currentPriceId as keyof typeof PRICE_MAPPINGS] || {}

  // Validate upgrade path
  if (!Object.values(upgradePaths).includes(targetPriceId)) {
    return NextResponse.json({ error: 'Invalid upgrade path' }, { status: 400 })
  }

  try {
    // Update subscription to new price
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: targetPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // Pro-rate the difference
    })

    // Fetch new price details
    const newPrice = await stripe.prices.retrieve(targetPriceId, {
      expand: ['product'],
    })
    const newProduct = newPrice.product as Stripe.Product

    return NextResponse.json({
      success: true,
      newSubscription: {
        id: updatedSubscription.id,
        product_name: newProduct.name,
        price: newPrice.unit_amount! / 100,
        currency: newPrice.currency,
        interval: newPrice.recurring?.interval || 'month',
        renews_on: new Date((updatedSubscription as any).current_period_end * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      },
    })
  } catch (error: any) {
    console.error('Stripe subscription update error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upgrade subscription' }, { status: 500 })
  }
}

function calculateSavings(
  currentPrice: number,
  currentInterval: string,
  newPrice: number,
  newInterval: string
): string {
  // Convert everything to monthly cost for comparison
  let currentMonthly = currentPrice
  if (currentInterval === 'week') {
    currentMonthly = currentPrice * 4.33 // average weeks per month
  } else if (currentInterval === 'day') {
    currentMonthly = currentPrice * 30
  }

  let newMonthly = newPrice
  if (newInterval === 'month') {
    newMonthly = newPrice
  } else if (newInterval === '6-month') {
    newMonthly = newPrice / 6
  } else if (newInterval === 'year') {
    newMonthly = newPrice / 12
  }

  const savingsPerMonth = currentMonthly - newMonthly
  const savingsPercent = ((savingsPerMonth / currentMonthly) * 100).toFixed(0)

  if (savingsPerMonth > 0) {
    return `Save $${savingsPerMonth.toFixed(2)}/month (${savingsPercent}%)`
  } else {
    return 'Better value'
  }
}

