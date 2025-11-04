// lib/config/subscriptions.js

export const SUBSCRIPTION_CONFIG = {
  // NEW UNIFIED SUBSCRIPTION (2025)
  insiderAllAccess: {
    name: 'Insider All Access',
    priceIds: [
      'price_1SIZoo07WIhZOuSIJB8OGgVU', // Weekly $29
      'price_1SIZoN07WIhZOuSIm8hTDjy4', // Monthly $99
      'price_1SIZp507WIhZOuSIFMzU7Kkm', // 6-Month $299
    ]
  },

  // LEGACY PRODUCTS (Grandfathered)
  insiderAdvantage: {
    name: 'Insider Advantage',
    priceIds: [
      'price_1SECSt07WIhZOuSIqQoUwbpY', // Weekly 1
      'price_1Qw8iY07WIhZOuSIC48z9vlc', // Weekly 2
      'price_1QuJos07WIhZOuSIc3iG0Nsi', // Monthly
      'price_1RdJwP07WIhZOuSIgQKcur3e', // 6 Monthly
    ]
  },

  insiderBets: {
    name: 'Insider Bets',
    priceIds: [
      'price_1R600p07WIhZOuSIrNk4pLau', // Monthly 1
      'price_1QuJnw07WIhZOuSIMflqulXj', // Monthly 2
      'price_1R5zzf07WIhZOuSIy0Wn2aZF', // Weekly
      'price_1RdJuK07WIhZOuSIn3UxIt4V', // 6 Monthly
    ]
  },

  insiderStats: {
    name: 'Insider Stats',
    priceIds: [
      'price_1QuJoM07WIhZOuSIERC3Dces', // Monthly
      'price_1Qw8ha07WIhZOuSI0fVoF8Am', // Weekly
      'price_1RdJoT07WIhZOuSIvK6yHiOK', // 6 Monthly
    ]
  },

  // Get all valid price IDs for "all access" check
  allAccess() {
    return [
      ...this.insiderAllAccess.priceIds, // New unified sub
      ...this.insiderAdvantage.priceIds, // Legacy
      ...this.insiderBets.priceIds, // Legacy
      ...this.insiderStats.priceIds // Legacy
    ];
  },

  // Check if a price ID grants "bets" access
  hasBetsAccess(priceId) {
    return [
      ...this.insiderAdvantage.priceIds,
      ...this.insiderBets.priceIds
    ].includes(priceId);
  },

  // Check if a price ID grants "stats" access
  hasStatsAccess(priceId) {
    return [
      ...this.insiderAdvantage.priceIds,
      ...this.insiderStats.priceIds
    ].includes(priceId);
  },

  // Check if a price ID is valid (exists in any product)
  isValidPriceId(priceId) {
    return this.allAccess().includes(priceId);
  },

  // Get product name for a given price ID
  getProductName(priceId) {
    if (this.insiderAdvantage.priceIds.includes(priceId)) {
      return this.insiderAdvantage.name;
    }
    if (this.insiderBets.priceIds.includes(priceId)) {
      return this.insiderBets.name;
    }
    if (this.insiderStats.priceIds.includes(priceId)) {
      return this.insiderStats.name;
    }
    return null;
  }
};

// Baseline date for checking if subscription is active
export const BASELINE_CANCEL_DATE = '1970-01-01T00:00:00.000Z';

// Helper to check if subscription is active based on cancelAt date
export function isSubscriptionActive(cancelAt) {
  if (!cancelAt) return false;
  
  // If it's the baseline date, subscription is active
  if (cancelAt === BASELINE_CANCEL_DATE) return true;
  
  // If cancel date is in the future, subscription is still active
  const cancelDate = new Date(cancelAt);
  const now = new Date();
  
  return cancelDate > now;
}