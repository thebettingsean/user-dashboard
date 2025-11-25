// Simulator cookie utilities for tracking free user sessions

const SESSION_ID_COOKIE = 'simulator_session_id';
const GENERATION_COUNT_COOKIE = 'simulator_generation_count';
const COOKIE_EXPIRY_DAYS = 30;

/**
 * Generate a unique session ID for tracking
 */
export function generateSessionId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create session ID from cookies
 */
export function getSessionId(): string {
  if (typeof document === 'undefined') return '';
  
  const existingSessionId = getCookie(SESSION_ID_COOKIE);
  if (existingSessionId) {
    return existingSessionId;
  }
  
  const newSessionId = generateSessionId();
  setCookie(SESSION_ID_COOKIE, newSessionId, COOKIE_EXPIRY_DAYS);
  return newSessionId;
}

/**
 * Get generation count from cookies
 */
export function getGenerationCount(): number {
  if (typeof document === 'undefined') return 0;
  
  const count = getCookie(GENERATION_COUNT_COOKIE);
  const parsed = count ? parseInt(count, 10) : 0;
  
  // Debug: Log count retrieval
  console.log('[Simulator Cookies] Get generation count:', { 
    cookieValue: count, 
    parsed,
    allCookies: document.cookie 
  });
  
  return parsed;
}

/**
 * Increment generation count in cookies
 */
export function incrementGenerationCount(): number {
  if (typeof document === 'undefined') return 0;
  
  const currentCount = getGenerationCount();
  const newCount = currentCount + 1;
  setCookie(GENERATION_COUNT_COOKIE, newCount.toString(), COOKIE_EXPIRY_DAYS);
  return newCount;
}

/**
 * Reset generation count (if user subscribes)
 */
export function resetGenerationCount(): void {
  if (typeof document === 'undefined') return;
  
  deleteCookie(GENERATION_COUNT_COOKIE);
}

/**
 * Check if user has reached the free generation limit
 */
export function hasReachedGenerationLimit(limit: number = 3): boolean {
  return getGenerationCount() >= limit;
}

/**
 * Get remaining generations for free users
 */
export function getRemainingGenerations(limit: number = 3): number {
  const used = getGenerationCount();
  return Math.max(0, limit - used);
}

// ============================================================================
// Cookie helpers
// ============================================================================

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Set cookie with explicit path and SameSite for better compatibility
  // Remove Secure flag to work in dev environment
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  
  // Debug: Log cookie setting
  console.log('[Simulator Cookies] Set cookie:', { name, value, success: getCookie(name) === value });
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

