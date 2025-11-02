import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes (no auth required)
// Since we're using lazy migration, all routes are public
// Auth checks happen in individual API routes/components
const isPublicRoute = createRouteMatcher([
  '/(.*)', // Make all routes public - auth is handled per component/API
])

export default clerkMiddleware((auth, request) => {
  // All routes are public - authentication is handled at the component/API level
  // This allows the lazy migration system to work properly
  return
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

