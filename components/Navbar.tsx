'use client'

import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In development, bypass Clerk to avoid CORS errors
  let isSignedIn = false
  let isLoaded = true
  
  if (!isDevelopment) {
    const clerkUser = useUser()
    isSignedIn = clerkUser.isSignedIn || false
    isLoaded = clerkUser.isLoaded
  } else {
    // Simulate signed-in state in development
    isSignedIn = true
    isLoaded = true
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (itemId: string) => {
    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    // Open immediately (no delay)
    setOpenDropdown(itemId)
  }

  const handleMouseLeave = () => {
    // Delay closing to allow smooth transition to dropdown
    const timeout = setTimeout(() => {
      setOpenDropdown(null)
    }, 150) // 150ms delay before closing
    setCloseTimeout(timeout)
  }

  return (
    <>

      {/* DESKTOP NAVBAR */}
      <nav className="desktop-nav">
        <div style={styles.desktopCenterSection}>
          <Link href="/">
            <img
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
              alt="The Betting Insider"
              style={styles.desktopLogo}
            />
          </Link>

          {/* Dashboard Dropdown */}
          <div
            style={styles.desktopNavButton}
            onMouseEnter={() => handleMouseEnter('dashboard')}
            onMouseLeave={handleMouseLeave}
          >
            <span style={styles.desktopNavButtonText}>Dashboard</span>
            
            {openDropdown === 'dashboard' && (
              <div 
                style={styles.dropdown}
                onMouseEnter={() => handleMouseEnter('dashboard')}
                onMouseLeave={handleMouseLeave}
              >
                <div style={styles.dropdownSection}>
                  <h4 style={styles.dropdownHeader}>YOUR HQ</h4>
                  <Link href="/sports" style={styles.dropdownLink}>
                    Home
                  </Link>
                  <Link href="/sports/picks" style={styles.dropdownLink}>
                    Today's Picks
                  </Link>
                  <Link href="/fantasy" style={styles.dropdownLink}>
                    Fantasy
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sports Dropdown */}
          <div
            style={styles.desktopNavButton}
            onMouseEnter={() => handleMouseEnter('sports')}
            onMouseLeave={handleMouseLeave}
          >
            <span style={styles.desktopNavButtonText}>Sports</span>
            
            {openDropdown === 'sports' && (
              <div 
                style={styles.dropdown}
                onMouseEnter={() => handleMouseEnter('sports')}
                onMouseLeave={handleMouseLeave}
              >
                <div style={styles.dropdownSection}>
                  <Link href="/sports/nfl/games" style={styles.dropdownLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg" 
                      alt="NFL" 
                      style={styles.sportLogo}
                    />
                    NFL
                  </Link>
                  <Link href="/sports/nba/games" style={styles.dropdownLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg" 
                      alt="NBA" 
                      style={styles.sportLogo}
                    />
                    NBA
                  </Link>
                  <Link href="/sports/nhl/games" style={styles.dropdownLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg" 
                      alt="NHL" 
                      style={styles.sportLogo}
                    />
                    NHL
                  </Link>
                  <Link href="/sports/college-football/games" style={styles.dropdownLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg" 
                      alt="NCAAF" 
                      style={styles.sportLogo}
                    />
                    NCAAF
                  </Link>
                  <div style={{...styles.dropdownLink, opacity: 0.5, cursor: 'default'}}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg" 
                      alt="NCAAB" 
                      style={{...styles.sportLogo, opacity: 0.5}}
                    />
                    NCAAB (soon)
                  </div>
                  <div style={{...styles.dropdownLink, opacity: 0.3, cursor: 'default'}}>
                    MLB (no season)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tools Dropdown */}
          <div
            style={styles.desktopNavButton}
            onMouseEnter={() => handleMouseEnter('tools')}
            onMouseLeave={handleMouseLeave}
          >
            <span style={styles.desktopNavButtonText}>Tools</span>
            
            {openDropdown === 'tools' && (
              <div 
                style={styles.dropdown}
                onMouseEnter={() => handleMouseEnter('tools')}
                onMouseLeave={handleMouseLeave}
              >
                <div style={styles.dropdownSection}>
                  <Link href="/sports-engine" style={styles.dropdownLinkGold}>
                    Sports Engine
                  </Link>
                  <Link href="/prop-parlay-tool" style={styles.dropdownLink}>
                    Perfect Parlays
                  </Link>
                  <Link href="/bankroll-builder" style={styles.dropdownLink}>
                    Bankroll Builder
                  </Link>
                  <Link href="/betting-guide" style={styles.dropdownLink}>
                    Betting Guide
                  </Link>
                  <Link href="/roi-calculator" style={styles.dropdownLink}>
                    ROI Calculator
                  </Link>
                  <Link href="/anytime-td" style={styles.dropdownLink}>
                    Anytime TD's
                  </Link>
                  <Link href="/sportsbooks" style={styles.dropdownLink}>
                    Top Sportsbooks
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Clerk Profile */}
          <div style={styles.desktopClerkWrapper}>
          {!isLoaded ? (
            <div style={styles.authLoading}>...</div>
          ) : isSignedIn ? (
            isDevelopment ? (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                D
              </div>
            ) : (
            <UserButton
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorBackground: '#1e293b',
                  colorInputBackground: '#0f172a',
                  colorText: '#ffffff',
                  colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
                  colorPrimary: '#3b82f6',
                  colorDanger: '#ef4444'
                },
                  elements: {
                    userButtonAvatarBox: {
                      width: '36px',
                      height: '36px'
                    },
                  card: {
                    backgroundColor: '#1e293b',
                    color: '#ffffff'
                  },
                  userButtonPopoverCard: {
                    backgroundColor: '#1e293b',
                    color: '#ffffff'
                  },
                  userButtonPopoverActions: {
                    color: '#ffffff'
                  },
                  userButtonPopoverActionButton: {
                    color: '#ffffff'
                  },
                  userButtonPopoverActionButtonText: {
                    color: '#ffffff'
                  }
                }
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Home"
                  labelIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  }
                  href="/sports"
                />
                <UserButton.Link
                  label="Manage Subscription"
                  labelIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                  }
                  href="/manage-subscription"
                />
                <UserButton.Action
                  label="View Pricing"
                  labelIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                  }
                  onClick={() => window.location.href = '/pricing'}
                />
              </UserButton.MenuItems>
            </UserButton>
            )
          ) : (
            <SignInButton mode="modal">
              <button style={styles.signInButton}>
                Sign In
              </button>
            </SignInButton>
          )}
          </div>
        </div>
      </nav>

      {/* MOBILE NAVBAR */}
      <nav className="mobile-nav">
        <div style={styles.mobileContainer}>
          {/* Hamburger Menu */}
          <button
            style={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span style={styles.hamburgerLine}></span>
            <span style={styles.hamburgerLine}></span>
            <span style={styles.hamburgerLine}></span>
          </button>

          {/* Logo */}
          <Link href="/">
            <img
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
              alt="The Betting Insider"
              style={styles.mobileLogo}
            />
          </Link>

          {/* User Button / Sign In */}
          <div style={styles.mobileAuth}>
            {!isLoaded ? (
              <div style={styles.authLoading}>...</div>
            ) : isSignedIn ? (
              isDevelopment ? (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  D
                </div>
              ) : (
              <UserButton
                appearance={{
                  baseTheme: undefined,
                  variables: {
                    colorBackground: '#1e293b',
                    colorInputBackground: '#0f172a',
                    colorText: '#ffffff',
                    colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
                    colorPrimary: '#3b82f6',
                    colorDanger: '#ef4444'
                  },
                  elements: {
                    userButtonAvatarBox: {
                      width: '36px',
                      height: '36px'
                    },
                    card: {
                      backgroundColor: '#1e293b',
                      color: '#ffffff'
                    },
                    userButtonPopoverCard: {
                      backgroundColor: '#1e293b',
                      color: '#ffffff'
                    },
                    userButtonPopoverActions: {
                      color: '#ffffff'
                    },
                    userButtonPopoverActionButton: {
                      color: '#ffffff'
                    },
                    userButtonPopoverActionButtonText: {
                      color: '#ffffff'
                    }
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Home"
                    labelIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                      </svg>
                    }
                    href="/sports"
                  />
                  <UserButton.Link
                    label="Manage Subscription"
                    labelIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                      </svg>
                    }
                    href="/manage-subscription"
                  />
                  <UserButton.Action
                    label="View Pricing"
                    labelIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                      </svg>
                    }
                    onClick={() => window.location.href = '/pricing'}
                  />
                </UserButton.MenuItems>
              </UserButton>
            )
            ) : (
              <SignInButton mode="modal">
                <button style={styles.mobileSignInButton}>
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            {/* Dashboard */}
            <div style={styles.mobileMenuItem}>
              <div
                style={styles.mobileMenuHeader}
                onClick={() => setOpenDropdown(openDropdown === 'dashboard' ? null : 'dashboard')}
              >
                Dashboard
                <span style={styles.mobileMenuArrow}>
                  {openDropdown === 'dashboard' ? '▼' : '▶'}
                </span>
              </div>

              {openDropdown === 'dashboard' && (
                <div style={styles.mobileSubMenu}>
                  <h4 style={styles.mobileSubHeader}>YOUR HQ</h4>
                  <Link href="/sports" style={styles.mobileSubLink}>
                    Home
                  </Link>
                  <Link href="/sports/picks" style={styles.mobileSubLink}>
                    Today's Picks
                  </Link>
                  <Link href="/fantasy" style={styles.mobileSubLink}>
                    Fantasy
                  </Link>
                </div>
              )}
            </div>

            {/* Sports */}
            <div style={styles.mobileMenuItem}>
              <div
                style={styles.mobileMenuHeader}
                onClick={() => setOpenDropdown(openDropdown === 'sports' ? null : 'sports')}
              >
                Sports
                <span style={styles.mobileMenuArrow}>
                  {openDropdown === 'sports' ? '▼' : '▶'}
                </span>
              </div>

              {openDropdown === 'sports' && (
                <div style={styles.mobileSubMenu}>
                  <Link href="/sports/nfl/games" style={styles.mobileSubLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg" 
                      alt="NFL" 
                      style={styles.sportLogo}
                    />
                    NFL
                  </Link>
                  <Link href="/sports/nba/games" style={styles.mobileSubLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg" 
                      alt="NBA" 
                      style={styles.sportLogo}
                    />
                    NBA
                  </Link>
                  <Link href="/sports/nhl/games" style={styles.mobileSubLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg" 
                      alt="NHL" 
                      style={styles.sportLogo}
                    />
                    NHL
                  </Link>
                  <Link href="/sports/college-football/games" style={styles.mobileSubLink}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg" 
                      alt="NCAAF" 
                      style={styles.sportLogo}
                    />
                    NCAAF
                  </Link>
                  <div style={styles.mobileSubLink} onClick={(e) => e.preventDefault()}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg" 
                      alt="NCAAB" 
                      style={{...styles.sportLogo, opacity: 0.5}}
                    />
                    NCAAB (soon)
                  </div>
                  <div style={{...styles.mobileSubLink, opacity: 0.5}} onClick={(e) => e.preventDefault()}>
                    MLB (no season)
                  </div>
                </div>
              )}
            </div>

            {/* Tools */}
            <div style={styles.mobileMenuItem}>
              <div
                style={styles.mobileMenuHeader}
                onClick={() => setOpenDropdown(openDropdown === 'tools' ? null : 'tools')}
              >
                Tools
                <span style={styles.mobileMenuArrow}>
                  {openDropdown === 'tools' ? '▼' : '▶'}
                </span>
              </div>

              {openDropdown === 'tools' && (
                <div style={styles.mobileSubMenu}>
                  <Link href="/sports-engine" style={styles.mobileSubLinkGold}>
                    Sports Engine
                  </Link>
                  <Link href="/prop-parlay-tool" style={styles.mobileSubLink}>
                    Perfect Parlays
                  </Link>
                  <Link href="/bankroll-builder" style={styles.mobileSubLink}>
                    Bankroll Builder
                  </Link>
                  <Link href="/betting-guide" style={styles.mobileSubLink}>
                    Betting Guide
                  </Link>
                  <Link href="/roi-calculator" style={styles.mobileSubLink}>
                    ROI Calculator
                  </Link>
                  <Link href="/anytime-td" style={styles.mobileSubLink}>
                    Anytime TD's
                  </Link>
                  <Link href="/sportsbooks" style={styles.mobileSubLink}>
                    Top Sportsbooks
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}

const styles = {
  // DESKTOP STYLES
  desktopCenterSection: {
    // ULTRA-TRANSPARENT GLASSMORPHISM - floats on any background:
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '0.5px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.2)',
    borderRadius: '60px',
    padding: '4px 24px',
    margin: '0 auto',
    maxWidth: 'fit-content',
    height: '54px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  desktopClerkWrapper: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '8px'
  },

  desktopLogo: {
    height: '60px',
    width: 'auto',
    cursor: 'pointer',
    marginRight: '24px'
  },

  desktopNavButton: {
    position: 'relative' as const,
    cursor: 'pointer',
    padding: '6px 14px',
    transition: 'all 0.2s ease'
  },

  desktopNavButtonText: {
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '600',
    letterSpacing: '0.02em'
  },

  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: '0',
    background: 'rgba(10, 15, 26, 0.85)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
    borderRadius: '16px',
    padding: '12px',
    minWidth: '200px',
    zIndex: 1001
  },

  dropdownSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },

  dropdownHeader: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '6px',
    marginTop: '4px',
    paddingLeft: '12px',
    margin: '4px 0 6px 0'
  },

  dropdownLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.2s ease'
  },

  dropdownLinkGold: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    color: '#fbbf24',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    background: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    transition: 'all 0.2s ease'
  },

  sportLogo: {
    width: '20px',
    height: '20px',
    objectFit: 'contain'
  },

  signInButton: {
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  authLoading: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.875rem'
  },

  // MOBILE STYLES
  mobileContainer: {
    // ULTRA-TRANSPARENT GLASSMORPHISM - floats on any background:
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '0.5px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.2)',
    borderRadius: '20px',
    padding: '4px 16px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  hamburger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },

  hamburgerLine: {
    width: '20px',
    height: '2px',
    background: '#ffffff',
    borderRadius: '2px',
    transition: 'all 0.3s ease'
  },

  mobileLogo: {
    height: '56px',
    width: 'auto'
  },

  mobileAuth: {
    display: 'flex',
    alignItems: 'center'
  },

  mobileSignInButton: {
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer'
  },

  mobileMenu: {
    background: 'rgba(10, 15, 26, 0.85)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
    borderRadius: '16px',
    marginTop: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },

  mobileMenuItem: {
    display: 'flex',
    flexDirection: 'column' as const
  },

  mobileMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    color: '#ffffff',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.03)',
    transition: 'all 0.2s ease'
  },

  mobileMenuArrow: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.6)'
  },

  mobileSubMenu: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginTop: '8px',
    marginLeft: '12px'
  },

  mobileSubHeader: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '6px',
    marginTop: '4px',
    paddingLeft: '12px',
    marginLeft: 0
  },

  mobileSubLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.2s ease'
  },

  mobileSubLinkGold: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    color: '#fbbf24',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    background: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    transition: 'all 0.2s ease'
  }
}
