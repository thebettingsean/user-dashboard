# Saved Queries Feature Implementation Guide

## Overview
This feature allows users to save, load, and manage their sports engine query builds.

## Database Setup
1. Run the SQL in `supabase-saved-queries-setup.sql` in your USERS Supabase project
2. This creates the `saved_queries` table with proper indexes and RLS policies

## API Routes Created
- `GET /api/saved-queries` - List all saved queries for the current user
- `POST /api/saved-queries` - Create a new saved query
- `GET /api/saved-queries/[id]` - Get a specific saved query
- `PUT /api/saved-queries/[id]` - Update a saved query
- `DELETE /api/saved-queries/[id]` - Delete a saved query
- `POST /api/saved-queries/[id]/run` - Mark a query as run (increment counter)

## Helper Functions
- `lib/saved-queries.ts` - Contains `serializeQueryState()` and `deserializeQueryConfig()` functions

## UI Components to Add

### 1. State Variables (add to SportsEngineContent component)
```typescript
const [savedQueries, setSavedQueries] = useState<any[]>([])
const [showSaveModal, setShowSaveModal] = useState(false)
const [saveQueryName, setSaveQueryName] = useState('')
const [saveQueryDescription, setSaveQueryDescription] = useState('')
const [savingQuery, setSavingQuery] = useState(false)
const [loadingSavedQueries, setLoadingSavedQueries] = useState(false)
```

### 2. Functions to Add
- `loadSavedQueries()` - Fetch all saved queries from API
- `handleSaveQuery()` - Save current query state
- `handleLoadQuery(query)` - Load a saved query into the builder
- `handleDeleteQuery(id)` - Delete a saved query

### 3. UI Changes
- Enable "My Builds" sidebar section (remove disabled class)
- Add "Save Build" button next to "Run Build" button
- Add save modal component
- Add saved queries list in "My Builds" section
- Add load/delete buttons for each saved query

## Next Steps
The implementation requires adding these components to the sports engine page. The file is very large (4798 lines), so edits should be made carefully.

