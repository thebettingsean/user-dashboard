// lib/hooks/useSubscription.js
'use client';

import { useUser } from '@clerk/nextjs';
import { SUBSCRIPTION_CONFIG, isSubscriptionActive } from '../config/subscriptions';

export function useSubscription() {
  const { user, isLoaded } = useUser();

  // Wait for Clerk to load
  if (!isLoaded) {
    return {
      isLoading: true,
      isSubscribed: false,
      hasAccess: () => false,
      hasBetsAccess: false,
      hasStatsAccess: false,
      subscriptionStatus: null,
      productName: null,
      firstName: null,
      username: null,
    };
  }

  // No user signed in
  if (!user) {
    return {
      isLoading: false,
      isSubscribed: false,
      hasAccess: () => false,
      hasBetsAccess: false,
      hasStatsAccess: false,
      subscriptionStatus: 'none',
      productName: null,
      firstName: null,
      username: null,
    };
  }

  // Get subscription data from private metadata
  const plan = user.unsafeMetadata?.plan;
  const cancelAt = user.unsafeMetadata?.cancelAt;

  // Get user's name and username
  const firstName = user.firstName || null;
  const username = user.username || null;

  // Check if subscription is active - ensure boolean
  const isActive = Boolean(plan && isSubscriptionActive(cancelAt));

  // Determine what access they have
  const hasBetsAccess = plan ? SUBSCRIPTION_CONFIG.hasBetsAccess(plan) : false;
  const hasStatsAccess = plan ? SUBSCRIPTION_CONFIG.hasStatsAccess(plan) : false;

  // Get their product name
  const productName = plan ? SUBSCRIPTION_CONFIG.getProductName(plan) : null;

  // Function to check if user has access to specific price IDs
  const hasAccess = (requiredPriceIds) => {
    if (!isActive || !plan) return false;
    return requiredPriceIds.includes(plan);
  };

  return {
    isLoading: false,
    isSubscribed: isActive,
    hasAccess,
    hasBetsAccess: Boolean(isActive && hasBetsAccess),
    hasStatsAccess: Boolean(isActive && hasStatsAccess),
    subscriptionStatus: isActive ? 'active' : plan ? 'canceled' : 'none',
    productName,
    priceId: plan,
    firstName,
    username,
  };
}