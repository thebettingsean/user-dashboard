// lib/hooks/useSubscription.js
'use client';

import { useUser } from '@clerk/nextjs';
import { SUBSCRIPTION_CONFIG } from '../config/subscriptions';

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

  // Get subscription data from unsafeMetadata
  const plan = user.privateMetadata?.plan;
  const canceledAt = user.privateMetadata?.canceledAt;

  // DEBUG LOGGING
  console.log('🔍 useSubscription Debug:');
  console.log('- User ID:', user.id);
  console.log('- Plan:', plan);
  console.log('- CanceledAt:', canceledAt);
  console.log('- First Name:', user.firstName);
  console.log('- All privateMetadata:', user.privateMetadata);

  // Get user's name and username
  const firstName = user.firstName || null;
  const username = user.username || null;

  // Check if they have a valid plan
  const hasValidPlan = plan && SUBSCRIPTION_CONFIG.isValidPriceId(plan);
  console.log('- Has Valid Plan:', hasValidPlan);
  console.log('- All valid price IDs:', SUBSCRIPTION_CONFIG.allAccess());

  // Check if subscription has expired
  let hasExpired = false;
  if (canceledAt) {
    const cancelDate = new Date(canceledAt);
    const now = new Date();
    hasExpired = cancelDate <= now;
    console.log('- Has Expired:', hasExpired, '(canceledAt:', canceledAt, ')');
  } else {
    console.log('- No canceledAt field (should be active)');
  }

  // Final active status
  const isActive = Boolean(hasValidPlan && !hasExpired);
  console.log('✅ FINAL IS ACTIVE:', isActive);

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
    subscriptionStatus: isActive ? 'active' : hasExpired ? 'expired' : plan ? 'canceled' : 'none',
    productName,
    priceId: plan,
    firstName,
    username,
  };
}