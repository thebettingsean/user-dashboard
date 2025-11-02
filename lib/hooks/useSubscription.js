// lib/hooks/useSubscription.js
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { SUBSCRIPTION_CONFIG } from '../config/subscriptions';

const SUPABASE_URL = 'https://cmulndosilihjhlurbth.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzAwMDAsImV4cCI6MjA2MTgwNjAwMH0.gIsjMoK0-ItRhE8F8Fbupwd-U3D0WInwFjdTt9_Ztr0';

export function useSubscription() {
  // Development mode bypass - check FIRST before any Clerk hooks
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Conditionally call Clerk hook only in production
  let clerkUser = { user: null, isLoaded: true };
  if (!isDevelopment) {
    clerkUser = useUser();
  }
  
  const { user, isLoaded } = clerkUser;
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      // In development, simulate a logged-in user with full access
      if (isDevelopment && isLoaded) {
        setSubscriptionData({ 
          hasAccess: true, 
          plan: 'price_1SIZoN07WIhZOuSIm8hTDjy4', // Advantage Monthly
          firstName: 'Developer'
        });
        return;
      }

      // If no user, set empty subscription data immediately
      if (isLoaded && !user) {
        setSubscriptionData({ hasAccess: false });
        return;
      }

      if (!isLoaded || !user || isChecking) return;
      
      setIsChecking(true);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/check-dashboard-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ userId: user.id })
        });

        const data = await response.json();
        console.log('🔍 Subscription check result:', data);
        setSubscriptionData(data);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionData({ hasAccess: false });
      } finally {
        setIsChecking(false);
      }
    }

    checkAccess();
  }, [user?.id, isLoaded]);

  // Wait for initial Clerk load
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

  // Wait for subscription check to complete (only if we have a user)
  if (user && !subscriptionData && isChecking) {
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

  // No user signed in - return immediately
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

  // Default to no access if we couldn't get subscription data
  const isActive = subscriptionData?.hasAccess || false;
  const plan = subscriptionData?.plan || null;

  const hasBetsAccess = plan ? SUBSCRIPTION_CONFIG.hasBetsAccess(plan) : false;
  const hasStatsAccess = plan ? SUBSCRIPTION_CONFIG.hasStatsAccess(plan) : false;
  const productName = plan ? SUBSCRIPTION_CONFIG.getProductName(plan) : null;

  return {
    isLoading: false,
    isSubscribed: isActive,
    hasAccess: () => isActive,
    hasBetsAccess: Boolean(isActive && hasBetsAccess),
    hasStatsAccess: Boolean(isActive && hasStatsAccess),
    subscriptionStatus: isActive ? 'active' : subscriptionData?.isExpired ? 'expired' : 'none',
    productName,
    priceId: plan,
    firstName: subscriptionData?.firstName || user.firstName,
    username: user.username,
  };
}