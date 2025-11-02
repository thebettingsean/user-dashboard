# AI Credit System - Implementation Guide

## Overview
A complete credit system for AI game scripts that allows free users to generate 3 scripts per week, while premium subscribers get unlimited access.

---

## Database Setup

### 1. Run SQL Script in Supabase
Open your **Betting Insider Users** Supabase project and run:

```bash
# File: supabase-users-setup.sql
```

This creates the `users` table with credit tracking columns.

### 2. Verify Environment Variables
The following are already configured in the code:

```env
SUPABASE_USERS_URL=https://pkmqhozyorpmteytizut.supabase.co
SUPABASE_USERS_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## How It Works

### User Flow

#### **New User (Not Logged In)**
1. Clicks "Generate Script" on a game
2. Sees modal: "Sign up for free to get 3 AI scripts per week"
3. Creates account via Clerk
4. User is created in Supabase with 3 credits
5. Script generates automatically

#### **Free User (Logged In)**
1. Credit badge shows "X/3 Scripts Remaining"
2. Clicks "Generate Script"
3. Script generates
4. Credit count decrements
5. Badge updates in real-time

#### **Free User (Out of Credits)**
1. Credit badge shows "0/3 Scripts Remaining"
2. Clicks "Generate Script"
3. Sees modal: "You've used all 3 free scripts - Upgrade for unlimited"
4. Can view pricing or close modal

#### **Premium User**
1. Credit badge shows "∞ Unlimited Scripts"
2. Clicks "Generate Script"
3. Script generates instantly
4. No credit tracking

---

## Credit Logic

### Premium Check
```typescript
// Check Clerk metadata for stripeCustomerId
const isPremium = !!user.publicMetadata?.stripeCustomerId

// Premium users bypass all credit checks
if (isPremium) {
  return { hasAccess: true, scriptsLimit: 'unlimited' }
}
```

### Credit Limits
- **Free Users**: 3 scripts per week
- **Premium Users**: Unlimited
- **Reset**: Every Monday at 00:00 UTC

### Existing Users
- **Active Subscribers**: Unlimited (has `stripeCustomerId`)
- **Cancelled Subscribers**: 3 credits/week (no `stripeCustomerId`)
- **Old Free Users**: 3 credits/week

---

## Files Created/Modified

### New Files
1. **`lib/supabase-users.ts`** - Supabase client for users database
2. **`app/api/users/sync/route.ts`** - Syncs Clerk user to Supabase
3. **`app/api/ai-credits/check/route.ts`** - Returns credit status
4. **`app/api/ai-credits/use/route.ts`** - Decrements credits
5. **`components/AICreditBadge.tsx`** - Displays credit count
6. **`supabase-users-setup.sql`** - Database schema

### Modified Files
1. **`app/page.tsx`** - Added credit badge to AI section
2. **`components/GameScriptModal.tsx`** - Added auth/upgrade checks

---

## API Endpoints

### `POST /api/users/sync`
Syncs Clerk user to Supabase (creates if new)
- **Auth**: Required (Clerk)
- **Response**: `{ user: User, created: boolean }`

### `GET /api/ai-credits/check`
Returns credit status for current user
- **Auth**: Optional
- **Response**:
```json
{
  "authenticated": true,
  "hasAccess": true,
  "scriptsUsed": 1,
  "scriptsLimit": 3,
  "isPremium": false,
  "resetAt": "2025-11-04T00:00:00Z"
}
```

### `POST /api/ai-credits/use`
Decrements credit count after generation
- **Auth**: Required (Clerk)
- **Response**: `{ success: true, scriptsUsed: 2, scriptsLimit: 3 }`

---

## Testing Locally

### Option 1: Test with Different Accounts
1. **Sign out** → Try to generate → See auth modal
2. **Sign up** with test email → See "3/3 remaining"
3. Generate 3 scripts → See "0/3 remaining"
4. Try to generate → See upgrade modal

### Option 2: Manually Test Premium
1. Sign in with your account
2. Go to Clerk Dashboard → Users → [Your User]
3. Add `stripeCustomerId: "cus_test123"` to Public Metadata
4. Refresh page → See "∞ Unlimited Scripts"

### Option 3: Debug in Supabase
1. Open Supabase → Table Editor → `users`
2. Find your user by `clerk_user_id`
3. Manually adjust `ai_scripts_used` to test limits
4. Change `is_premium` to test premium flow

---

## Weekly Reset (Future Implementation)

### Vercel Cron Job
Create `/app/api/cron/reset-credits/route.ts`:

```typescript
// Runs every Monday at 00:00 UTC
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await supabaseUsers
    .from('users')
    .update({ 
      ai_scripts_used: 0, 
      ai_scripts_reset_at: getNextMonday() 
    })
    .eq('is_premium', false)

  return Response.json({ success: true })
}
```

### Vercel Configuration
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reset-credits",
    "schedule": "0 0 * * 1"
  }]
}
```

---

## Troubleshooting

### "User not found" error
- Run `POST /api/users/sync` to create user in Supabase
- Check Clerk user is authenticated

### Credits not updating
- Check browser console for API errors
- Verify Supabase credentials are correct
- Ensure `refreshAICredits()` is called after generation

### Premium not detected
- Verify `stripeCustomerId` exists in Clerk metadata
- Check `is_premium` field in Supabase users table
- Ensure user sync ran after metadata update

---

## Migrating Existing Users (6K+)

You have **3 options** to migrate your existing Clerk users:

### **Option 1: Lazy Migration (Recommended)**
Users are automatically migrated **the first time they visit the site** after this update.

**How it works:**
- User visits dashboard
- `AICreditBadge` or `GameScriptModal` calls `/api/users/sync`
- User is created in Supabase with correct premium status
- Zero manual work required

**Pros:**
- ✅ Zero effort
- ✅ No API rate limits
- ✅ Only active users get migrated
- ✅ Handles premium status automatically

**Cons:**
- Inactive users won't be migrated (but they're not using the feature anyway)

---

### **Option 2: API Migration Endpoint**
Run a one-time API call to migrate ALL users at once.

**How to use:**
```bash
# Add this to your .env.local
ADMIN_SECRET_KEY=your-super-secret-key

# Run locally:
curl -X POST http://localhost:3003/api/admin/migrate-users \
  -H "Authorization: Bearer your-super-secret-key"

# Or in production:
curl -X POST https://dashboard.thebettinginsider.com/api/admin/migrate-users \
  -H "Authorization: Bearer your-super-secret-key"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalProcessed": 6000,
    "migrated": 5800,
    "skipped": 200,
    "errors": 0
  }
}
```

**Pros:**
- ✅ All users migrated immediately
- ✅ Can run anytime
- ✅ Shows detailed stats

**Cons:**
- Takes ~10-15 minutes for 6K users (Clerk rate limits)
- Requires setting up admin secret key

---

### **Option 3: TypeScript Migration Script**
Run a local script with `ts-node`.

**How to use:**
```bash
# Install ts-node if needed
npm install -D ts-node

# Run migration
npx ts-node scripts/migrate-clerk-users.ts
```

**Pros:**
- ✅ Full control
- ✅ Detailed logging
- ✅ Can customize logic

**Cons:**
- Requires local setup
- Manual execution

---

### **My Recommendation**

Use **Option 1 (Lazy Migration)** because:
1. It's automatic and requires zero work
2. Only active users get migrated (inactive users won't use AI scripts anyway)
3. Premium status is always up-to-date
4. No risk of hitting rate limits

If you really want to migrate everyone upfront, use **Option 2** after deploying to production.

---

## Next Steps

1. ✅ Run SQL script in Supabase
2. ✅ Test auth flow (sign out, try to generate)
3. ✅ Test free user flow (generate 3 scripts)
4. ✅ Test premium flow (add metadata, see unlimited)
5. ⏳ (Optional) Run migration endpoint to backfill all users
6. ⏳ Set up Vercel cron for weekly reset
7. ⏳ Monitor usage analytics

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for API errors
3. Verify environment variables are set
4. Test with a fresh incognito window

