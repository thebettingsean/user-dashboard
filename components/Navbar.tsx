'use client'

import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dashboardSubOpen, setDashboardSubOpen] = useState(false)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)

  const premiumFeatures = [
    {
      label: 'Analyst Picks',
      href: 'thebettinginsider.com/betting/about',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e2f7f68a9d80033122_1.svg',
      description: 'Expert picks backed by data'
    },
    {
      label: 'Public Betting',
      href: 'thebettinginsider.com/stats-about',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3e85df3d969700cf1_2.svg',
      description: 'See where the money is going'
    },
    {
      label: 'Matchup Data',
      href: 'thebettinginsider.com/stats-about',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3b2585150b82c6baa_3.svg',
      description: 'Detailed team data'
    },
    {
      label: 'Fantasy Football',
      href: 'thebettinginsider.com/fantasy/home',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e324225a9738395c91_4.svg',
      description: 'Start/Sit, Waiver, Trade tools'
    },
    {
      label: 'Prop Data',
      href: 'thebettinginsider.com/stats-about',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3e5402543f8b5458a_5.svg',
      description: 'Player prop insights and angles'
    },
    {
      label: 'Referee Trends',
      href: 'thebettinginsider.com/stats-about',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3ebdab11d2f519eb1_6.svg',
      description: 'Historical referee data'
    }
  ]

  const freeTools = [
    {
      label: 'Perfect Parlays',
      href: 'https://dashboard.thebettinginsider.com/prop-parlay-tool',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e3ef8673f9a7c75b24bf2f_PPP%20BRANDING!-3.svg'
    },
    {
      label: 'Top TD Leaders',
      href: 'https://dashboard.thebettinginsider.com/anytime-td',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e19b93de43f1c36af5b432_6.svg'
    },
    {
      label: 'Bankroll Builder',
      href: 'https://www.thebettinginsider.com/tools/bankroll-builder',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c3ea0594da2784e87_6.svg'
    },
    {
      label: 'ROI Calculator',
      href: 'https://www.thebettinginsider.com/tools/roi-calculator',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e03b768ecad17fb0140a6c_1.svg'
    },
    {
      label: 'Betting Guide',
      href: 'https://www.thebettinginsider.com/tools/insider-betting-guide',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg'
    },
    {
      label: 'Top Rated Books',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e0313f97df902b5312a3f6_NEW%20BOOK%20LOGOS%20SVG-2.svg'
    }
  ]

  const dashboardLinks = [
    { label: 'Home', href: 'https://dashboard.thebettinginsider.com', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7becb3f2815198790_1.svg' },
    { label: 'Analyst Picks', href: 'https://dashboard.thebettinginsider.com/analyst-picks', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e2f7f68a9d80033122_1.svg' },
    { label: 'Public Betting', href: 'https://dashboard.thebettinginsider.com', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3e85df3d969700cf1_2.svg' },
    { label: 'Matchup Data', href: 'https://dashboard.thebettinginsider.com', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e3b2585150b82c6baa_3.svg' },
    { label: 'Prop Parlay Tool', href: 'https://dashboard.thebettinginsider.com/prop-parlay-tool', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg' },
    { label: 'Fantasy Football', href: 'https://dashboard.thebettinginsider.com/fantasy', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5b8e324225a9738395c91_4.svg' },
    { label: 'Top TD Scorers', href: 'https://dashboard.thebettinginsider.com/anytime-td', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5dd3c882be50e10645_4.svg' },
    { label: 'The Weekly Report', href: 'https://dashboard.thebettinginsider.com', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg' }
  ]

  const hqLinks = [
    { label: 'Your Dashboard', href: 'https://dashboard.thebettinginsider.com' },
    { label: 'Contact Us', href: 'https://thebettinginsider.com/contact-us' },
    { label: 'Company', href: 'https://thebettinginsider.com/insider-company' },
    { label: 'Articles', href: 'https://thebettinginsider.com/insider-blog' },
    { label: 'FAQ\'s', href: 'https://thebettinginsider.com/insider-faqs' }
  ]

  const navItems = [
    {
      id: 'premium',
      label: 'Premium Features',
      type: 'premium'
    },
    {
      id: 'tools',
      label: 'Free Tools',
      type: 'free-tools'
    },
    {
      id: 'hq',
      label: 'HQ',
      type: 'hq'
    }
  ]

  const handleMouseEnter = (itemId: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    setOpenDropdown(itemId)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null)
    }, 200) // 200ms delay before closing
    setCloseTimeout(timeout)
  }

  return (
    <>
      <style jsx>{`
        .desktop-nav {
          position: fixed;
          top: 20px;
          left: 0;
          right: 0;
          z-index: 1000;
          display: flex;
          justify-content: center; /* Center the navbar */
        }
        
        .mobile-nav {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: calc(100% - 40px);
          max-width: 500px;
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
        }
        
        @media (min-width: 768px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>

      {/* DESKTOP NAVBAR - One centered bar */}
      <nav className="desktop-nav">
        {/* ONE CENTERED SECTION - Logo + Nav Items + Clerk */}
        <div style={styles.desktopCenterSection}>
          <Link href={isSignedIn ? 'https://dashboard.thebettinginsider.com' : 'https://www.thebettinginsider.com'}>
            <img
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
              alt="The Betting Insider"
              style={styles.desktopLogo}
            />
          </Link>

          {navItems.map(item => (
            <div
              key={item.id}
              style={styles.desktopNavButton}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
            >
              <span style={styles.desktopNavButtonText}>{item.label.split(' ')[0].toUpperCase()}</span>
              
              {openDropdown === item.id && (
                <div 
                  style={styles.dropdown}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {item.type === 'premium' && (
                    <div style={styles.premiumGrid}>
                      {premiumFeatures.map((feature, idx) => (
                        <Link
                          key={idx}
                          href={feature.href}
                          style={styles.premiumCard}
                        >
                          <div style={styles.premiumIconWrapper}>
                            <img
                              src={feature.icon}
                              alt={feature.label}
                              style={styles.premiumIcon}
                            />
                          </div>
                          <div>
                            <h3 style={styles.premiumLabel}>{feature.label}</h3>
                            <p style={styles.premiumDescription}>{feature.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {item.type === 'free-tools' && (
                    <div style={styles.freeToolsGrid}>
                      {freeTools.map((tool, idx) => (
                        <Link
                          key={idx}
                          href={tool.href}
                          style={styles.freeToolItem}
                        >
                          <img
                            src={tool.icon}
                            alt={tool.label}
                            style={styles.freeToolIcon}
                          />
                          <span style={styles.freeToolLabel}>{tool.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {item.type === 'hq' && (
                    <div style={styles.hqDropdown}>
                      {hqLinks.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.href}
                          style={styles.hqLink}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Clerk Profile INSIDE the navbar */}
          <div style={styles.desktopClerkWrapper}>
          {!isLoaded ? (
            <div style={styles.authLoading}>...</div>
          ) : isSignedIn ? (
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
                  href="https://dashboard.thebettinginsider.com"
                />
                <UserButton.Link
                  label="Manage Subscription"
                  labelIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                  }
                  href="https://dashboard.thebettinginsider.com/manage-subscription"
                />
                <UserButton.Action
                  label="View Pricing"
                  labelIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                  }
                  onClick={() => window.location.href = 'https://thebettinginsider.com/pricing'}
                />
              </UserButton.MenuItems>
            </UserButton>
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

      {/* MOBILE NAVBAR - One centered floating bar */}
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
          <Link href={isSignedIn ? 'https://dashboard.thebettinginsider.com' : 'https://www.thebettinginsider.com'}>
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
                    href="https://dashboard.thebettinginsider.com"
                  />
                  <UserButton.Link
                    label="Manage Subscription"
                    labelIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                      </svg>
                    }
                    href="https://dashboard.thebettinginsider.com/manage-subscription"
                  />
                  <UserButton.Action
                    label="View Pricing"
                    labelIcon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                      </svg>
                    }
                    onClick={() => window.location.href = 'https://thebettinginsider.com/pricing'}
                  />
                </UserButton.MenuItems>
              </UserButton>
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
            {navItems.map(item => (
              <div key={item.id} style={styles.mobileMenuItem}>
                <div
                  style={styles.mobileMenuHeader}
                  onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                >
                  {item.label}
                  <span style={styles.mobileMenuArrow}>
                    {openDropdown === item.id ? '▼' : '▶'}
                  </span>
                </div>

                {openDropdown === item.id && (
                  <div style={styles.mobileSubMenu}>
                    {item.type === 'premium' && premiumFeatures.map((feature, idx) => (
                      <Link
                        key={idx}
                        href={feature.href}
                        style={styles.mobileSubLink}
                      >
                        {feature.label}
                      </Link>
                    ))}
                    {item.type === 'free-tools' && freeTools.map((tool, idx) => (
                      <Link
                        key={idx}
                        href={tool.href}
                        style={styles.mobileSubLink}
                      >
                        {tool.label}
                      </Link>
                    ))}
                    {item.type === 'hq' && (
                      <>
                        <Link href="https://dashboard.thebettinginsider.com" style={styles.mobileSubLink}>
                          Your Dashboard
                        </Link>
                        <Link href="https://dashboard.thebettinginsider.com/maximize-profit" style={styles.mobileSubLink}>
                          Maximize Profit Guide
                        </Link>
                        <Link href="https://thebettinginsider.com/pricing" style={styles.mobileSubLink}>
                          Pricing
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}

const styles = {
  // DESKTOP STYLES
  desktopCenterSection: {
    // PROPER GLASSMORPHISM:
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    borderRadius: '60px', // More pill-shaped
    padding: '8px 24px', // Reduced vertical padding (was 12px)
    margin: '0 auto', // Center the bar
    maxWidth: 'fit-content',
    display: 'flex',
    alignItems: 'center',
    gap: '16px' // Reduced gap between items
  },

  desktopClerkWrapper: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '8px' // Small gap before Clerk button
  },

  desktopLogo: {
    height: '48px', // Increased logo size
    width: 'auto',
    cursor: 'pointer'
  },

  desktopNavButton: {
    position: 'relative' as const,
    cursor: 'pointer',
    padding: '6px 14px', // Reduced padding
    transition: 'all 0.2s ease'
  },

  desktopNavButtonText: {
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '600',
    letterSpacing: '0.05em'
  },

  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)', // Reduced gap for easier hovering
    left: '0', // Align left to prevent cutoff
    // PROPER GLASSMORPHISM:
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    borderRadius: '16px',
    padding: '16px',
    minWidth: '200px',
    zIndex: 1001
  },

  premiumGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns for proper layout
    gap: '12px',
    minWidth: '650px'
  },

  premiumCard: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    color: '#ffffff'
  },

  premiumIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },

  premiumIcon: {
    width: '24px',
    height: '24px',
    objectFit: 'contain' as const
  },

  premiumLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#ffffff'
  },

  premiumDescription: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: '1.3'
  },

  freeToolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    minWidth: '400px'
  },

  freeToolItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.03)',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    color: '#ffffff'
  },

  freeToolIcon: {
    width: '24px',
    height: '24px',
    objectFit: 'contain' as const
  },

  freeToolLabel: {
    fontSize: '0.8125rem',
    fontWeight: '500'
  },

  hqDropdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    minWidth: '220px'
  },

  hqItem: {
    position: 'relative' as const
  },

  hqLink: {
    display: 'block',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '500'
  },

  hqSubDropdown: {
    position: 'absolute' as const,
    left: '100%',
    top: '0',
    marginLeft: '8px',
    // PROPER GLASSMORPHISM:
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    borderRadius: '12px',
    padding: '12px',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },

  hqSubHeader: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '6px',
    paddingLeft: '4px'
  },

  hqSubLink: {
    display: 'block',
    padding: '8px 10px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    color: '#ffffff',
    fontSize: '0.8125rem',
    fontWeight: '500'
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
    // PROPER GLASSMORPHISM:
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    borderRadius: '20px',
    padding: '8px 16px', // Reduced padding (was 12px 20px)
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
    height: '44px', // Increased logo size
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
    // PROPER GLASSMORPHISM:
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '0.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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

  mobileSubLink: {
    display: 'block',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.2s ease'
  }
}
