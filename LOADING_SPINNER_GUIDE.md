# Beautiful Loading Spinner Guide

## Overview
We've created a smooth, animated loading spinner component that can be used throughout the entire site. It features:
- Orbiting dots with pulse effects
- Rotating ring
- Pulsing center
- Customizable colors and sizes
- Optional loading text
- Smooth animations

## Usage

### Import
```tsx
import LoadingSpinner, { InlineLoadingSpinner } from '@/components/LoadingSpinner'
```

### Main Loading Spinner

#### Basic Usage
```tsx
<LoadingSpinner />
```

#### With Custom Size
```tsx
<LoadingSpinner size="small" />   // 24px
<LoadingSpinner size="medium" />  // 40px (default)
<LoadingSpinner size="large" />   // 60px
<LoadingSpinner size="xlarge" />  // 80px
```

#### With Custom Color
```tsx
<LoadingSpinner color="#10b981" />  // Green
<LoadingSpinner color="#ef4444" />  // Red
<LoadingSpinner color="#f59e0b" />  // Yellow
<LoadingSpinner color="#a78bfa" />  // Purple (default)
```

#### With Loading Text
```tsx
<LoadingSpinner 
  size="large" 
  color="#a78bfa"
  text="Loading game data..."
/>
```

### Inline Loading Spinner

For inline use (buttons, text, etc):
```tsx
<InlineLoadingSpinner />
<InlineLoadingSpinner color="#10b981" />
```

## Examples

### Full Page Loading
```tsx
<div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  minHeight: '400px' 
}}>
  <LoadingSpinner 
    size="xlarge"
    text="Loading your dashboard..."
  />
</div>
```

### Widget Loading State
```tsx
{loading && (
  <div style={{ padding: '3rem', textAlign: 'center' }}>
    <LoadingSpinner size="large" text="Fetching data..." />
  </div>
)}
```

### Button Loading State
```tsx
<button disabled={isLoading}>
  {isLoading ? (
    <>
      <InlineLoadingSpinner /> Loading...
    </>
  ) : (
    'Submit'
  )}
</button>
```

### Modal Loading
```tsx
{loading && (
  <div style={{ textAlign: 'center', padding: '3rem' }}>
    <LoadingSpinner 
      size="xlarge" 
      color="#a78bfa"
      text="Analyzing game data and generating your AI script..."
    />
  </div>
)}
```

## Currently Implemented

✅ **GameScriptModal** - Uses xlarge spinner with custom text during AI generation

## Recommended Updates

Consider updating these components to use the new spinner:

1. **StatsWidget.tsx** - Replace basic loading state
2. **MatchupWidget.tsx** - Replace basic loading state  
3. **PicksWidget.js** - Replace basic loading state
4. **TopPropsWidget.tsx** - Replace basic loading state
5. **FantasyWidget.js** - Replace basic loading state
6. **TDWidget.js** - Replace basic loading state
7. **NewsWidget.tsx** - Replace basic loading state

## Animation Details

The spinner features three coordinated animations:
1. **Center Pulse** - 2s ease-in-out, scales from 1 to 1.2
2. **Orbiting Dots** - 2s linear rotation with staggered delays
3. **Rotating Ring** - 1.5s linear spin
4. **Text Fade** - 2s opacity pulse (if text provided)

All animations are synchronized for a smooth, premium feel.

