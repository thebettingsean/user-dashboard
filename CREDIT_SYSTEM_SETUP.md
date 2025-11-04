# AI Credit System Setup Guide

## Overview
The new AI credit system has **NO FREE CREDITS**. Users must purchase credits or subscribe to access AI game scripts.

## Purchase Options
1. **$10 Credit Pack**: 15 AI scripts (one-time, AI access only)
2. **Subscription**: Unlimited AI scripts + full dashboard access

---

## 🔧 Setup Instructions

### 1. Run Supabase Migration
Go to your **"Betting Insider Users"** Supabase project SQL editor and run:

```sql
-- Add new columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS purchased_credits INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'none' CHECK (access_level IN ('none', 'ai_only', 'full'));

-- Update existing users
UPDATE users 
SET access_level = CASE 
  WHEN is_premium = true THEN 'full' 
  ELSE 'none' 
END;

-- Remove free credits
UPDATE users SET ai_scripts_limit = 0;

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_access_level ON users(access_level);

-- Add documentation
COMMENT ON COLUMN users.purchased_credits IS 'One-time purchased credits (from $10 pack). Non-renewing.';
COMMENT ON COLUMN users.access_level IS 'none = no access, ai_only = credit pack only, full = subscription';
COMMENT ON COLUMN users.ai_scripts_limit IS 'Weekly free credits (now 0 for all users)';
```

### 2. Add Environment Variables to Vercel

```bash
# Stripe webhook secret for credit purchases
STRIPE_WEBHOOK_SECRET_CREDITS=whsec_m6aC67r3cfoukkCwjln7urfSBs07wfIf
```

### 3. Verify Stripe Webhook
✅ **Already completed!**
- Endpoint: `https://dashboard.thebettinginsider.com/api/webhooks/stripe-credits`
- Event: `checkout.session.completed`
- Secret: `whsec_m6aC67r3cfoukkCwjln7urfSBs07wfIf`

### 4. Verify Stripe Product ID
Confirm in Stripe Dashboard:
- Product ID: `prod_TMXEu43ED8OpVx`
- Price: $10.00
- Credits: 15 AI scripts

---

## 📊 How It Works

### For Users Without Credits:
1. User clicks "Generate" on a game
2. Modal shows: **"No Credits Remaining"**
3. Two options displayed:
   - **$10 Credit Pack** (15 scripts, AI only)
   - **Subscription** (unlimited + full access)
4. User selects an option
5. Redirected to Stripe Checkout or pricing page

### After Credit Pack Purchase:
1. Stripe fires `checkout.session.completed` webhook
2. `/api/webhooks/stripe-credits` receives event
3. Adds 15 credits to user's `purchased_credits`
4. Sets `access_level` to `'ai_only'`
5. User can generate scripts (but can't access other widgets)

### After Subscription Purchase:
1. User purchases via main website
2. Clerk metadata updated with subscription
3. `/api/users/sync` sets `access_level` to `'full'`
4. User gets unlimited AI + full dashboard access

---

## 🔐 Access Levels

| Level    | AI Scripts | Other Widgets | Pricing          |
|----------|------------|---------------|------------------|
| `none`   | ❌         | ❌            | Free (no access) |
| `ai_only`| ✅ (15)    | ❌            | $10 one-time     |
| `full`   | ✅ (∞)     | ✅            | $5+/week sub     |

---

## 🧪 Testing

### Test Free User (No Credits):
1. Sign up with new account
2. Try to generate script
3. Should show "No Credits Remaining" with purchase options

### Test Credit Pack Purchase:
1. Click "$10" option in modal
2. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
3. Redirect back to dashboard
4. Badge should show "15 credits left"
5. Generate script → credits decrement

### Test Subscription User:
1. Sign in with premium account
2. Badge should show "Unlimited Scripts"
3. Generate script → no credit deduction

---

## 🐛 Troubleshooting

### Credits Not Added After Purchase
- Check Vercel logs for webhook errors
- Verify `STRIPE_WEBHOOK_SECRET_CREDITS` is correct
- Check Stripe webhook logs for delivery issues

### User Shows Wrong Access Level
- Check Clerk metadata (`privateMetadata.plan`)
- Verify `/api/users/sync` is being called
- Check Supabase `users` table for correct `access_level`

### Widgets Still Visible for `ai_only` Users
- Need to implement Phase 3 (widget locking)
- Coming next!

---

## ✅ Completed Phases

- ✅ **Phase 1**: Credit system overhaul (0 free credits)
- ✅ **Phase 2**: Purchase flow ($10 pack + subscription options)

## 🚧 TODO Phases

- ⏳ **Phase 3**: Lock widgets for `ai_only` users
- ⏳ **Phase 4**: Enable CFB, CBB, NHL sports
- ⏳ **Phase 5**: Fix cache storage

---

## 📝 Notes

- Credit pack purchases are **one-time** (credits don't expire)
- Subscription users get **unlimited** AI + full access
- Free users get **0 credits** (must purchase to use AI)
- All credit logic is in `app/api/ai-credits/*`
- Webhook handler is in `app/webhooks/stripe-credits/route.ts`

