'use client'

import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const premiumFeatures = [
    {
      label: 'Analyst Picks',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9405e211db4d96a6f3c78_1.svg',
      description: 'Expert picks backed by data'
    },
    {
      label: 'Referee Trends',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9405e3d1f4d0174905c00_6.svg',
      description: 'Historical referee data'
    },
    {
      label: 'Matchup Data',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9406088227a3da1f24af7_2.svg',
      description: 'Detailed team data'
    },
    {
      label: 'Public Betting',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9405eadd52d3bb0504f91_3.svg',
      description: 'See where the money is going'
    },
    {
      label: 'Prop Data',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9405e0e2b65da9f879088_5.svg',
      description: 'Player prop insights and angles'
    },
    {
      label: 'Fantasy Football',
      href: '#',
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e9405e9aedfdf2c023d1fa_4.svg',
      description: 'Start/Sit, Waiver, Trade tools'
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
      href: 'https://www.thebettinginsider.com/tools/nfl-anytime-td-tool',
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

  const navItems = [
    {
      id: 'premium',
      label: 'Premium Features',
      href: '#',
      type: 'premium'
    },
    {
      id: 'free-tools',
      label: 'Free Tools',
      href: '#',
      type: 'free-tools'
    },
    {
      id: 'insider-hq',
      label: 'Insider HQ',
      href: '#',
      dropdown: [
        { label: 'Your Dashboard', href: 'https://dashboard.thebettinginsider.com' },
        { label: 'Contact Us', href: 'https://www.thebettinginsider.com/contact-us' },
        { label: 'Articles', href: '#' },
        { label: "FAQ's", href: 'https://www.thebettinginsider.com/insider-faq' },
        { label: 'About', href: 'https://www.thebettinginsider.com/insider-company' },
        { label: 'Pricing', href: 'https://www.thebettinginsider.com/pricing' }
      ]
    }
  ]

  return (
    <>
      <style jsx>{`
        .navbar {
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(10px);
          min-height: 85px;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .navbar-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .logo-container {
          display: flex;
          align-items: center;
        }

        .logo {
          height: 85px;
          width: auto;
          cursor: pointer;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          margin-right: 1rem;
        }

        .hamburger span {
          width: 24px;
          height: 2px;
          background: white;
          transition: all 0.3s;
        }

        .desktop-nav {
          display: none;
          gap: 2rem;
          align-items: center;
          flex: 1;
          margin-left: 3rem;
        }

        .nav-item {
          position: relative;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s, background 0.2s;
          cursor: pointer;
          white-space: nowrap;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .nav-item:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.06);
        }

        .nav-item.has-dropdown::after {
          content: '▼';
          margin-left: 0.3rem;
          font-size: 0.65rem;
          opacity: 0.6;
        }

        .dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.5rem;
          background: rgba(20, 20, 20, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.5rem 0;
          min-width: 220px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .nav-item:hover .dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .premium-dropdown {
          min-width: 550px;
          padding: 1.5rem;
        }

        .premium-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .premium-card {
          background: rgba(40, 40, 40, 0.95);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 0;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .premium-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }

        .premium-card-icon-wrapper {
          width: 100%;
          height: 80px;
          overflow: hidden;
          border-radius: 12px 12px 0 0;
        }

        .premium-card-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .premium-card-text {
          padding: 0.6rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          background: rgba(30, 30, 30, 0.8);
        }

        .premium-card-label {
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          margin: 0;
          text-align: left;
        }

        .premium-card-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.7rem;
          margin: 0;
          text-align: left;
        }

        .free-tools-dropdown {
          min-width: 520px;
          padding: 1.25rem;
        }

        .free-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .free-tool-item {
          display: flex;
          align-items: center;
          gap: 2.5rem;
          padding: 0.85rem 1.15rem;
          color: white;
          text-decoration: none;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .free-tool-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .free-tool-icon {
          width: 20px;
          height: 20px;
          object-fit: contain;
          flex-shrink: 0;
          margin-right: 1rem;
          position: relative;
          top: 4px;
        }

        .free-tool-label {
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.2;
        }

        .dropdown-item {
          display: block;
          padding: 0.75rem 1.25rem;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }

        .auth-section {
          display: flex;
          align-items: center;
        }

        .auth-section :global(.cl-userButtonBox) {
          width: 45px;
          height: 45px;
        }

        .auth-section :global(.cl-userButtonTrigger) {
          width: 45px !important;
          height: 45px !important;
        }

        .auth-section :global(.cl-avatarBox) {
          width: 45px;
          height: 45px;
        }

        .sign-in-button {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
          border: 0.5px solid rgba(59, 130, 246, 0.6);
          color: white;
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sign-in-button:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%);
          border-color: rgba(59, 130, 246, 0.8);
        }

        .mobile-menu {
          position: absolute;
          top: 90px;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.98);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.35s ease;
          backdrop-filter: blur(10px);
          z-index: 900;
        }

        .mobile-menu.open {
          max-height: 600px;
          opacity: 1;
          transform: translateY(0);
        }

        .mobile-nav-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-nav-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-nav-link:hover {
          background: rgba(255, 255, 255, 0.03);
          color: white;
        }

        .mobile-dropdown {
          background: rgba(0, 0, 0, 0.3);
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s;
        }

        .mobile-dropdown.open {
          max-height: 600px;
          overflow-y: auto;
        }

        .mobile-dropdown-item {
          display: block;
          padding: 0.75rem 1.5rem 0.75rem 3rem;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-dropdown-item:last-child {
          border-bottom: none;
        }

        .mobile-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .mobile-premium-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          padding: 1rem;
        }

        .mobile-premium-card {
          background: rgba(40, 40, 40, 0.95);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
        }

        .mobile-premium-card-icon-wrapper {
          width: 100%;
          height: 60px;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
        }

        .mobile-premium-card-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mobile-premium-card-text {
          padding: 0.5rem 0.6rem;
          background: rgba(30, 30, 30, 0.8);
        }

        .mobile-premium-card-label {
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .mobile-premium-card-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.65rem;
          margin: 0;
        }

        /* FIXED: Mobile Free Tools Dropdown - Match Insider HQ styling with !important overrides */
        .mobile-free-tools-list {
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          background: rgba(0, 0, 0, 0.3) !important;
          margin: 0 !important;
        }

        .mobile-dropdown .mobile-free-tool-item,
        a.mobile-free-tool-item {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
          padding: 0.75rem 1.5rem 0.75rem 3rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          text-decoration: none !important;
          font-size: 0.9rem !important;
          transition: all 0.2s !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          background: transparent !important;
          margin: 0 !important;
          line-height: 1.5 !important;
        }

        .mobile-dropdown .mobile-free-tool-item:last-child,
        a.mobile-free-tool-item:last-child {
          border-bottom: none !important;
        }

        .mobile-dropdown .mobile-free-tool-item:hover,
        a.mobile-free-tool-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
        }

        .mobile-free-tool-icon {
          width: 16px !important;
          height: 16px !important;
          object-fit: contain !important;
          flex-shrink: 0 !important;
          margin: 0 !important;
        }

        @media (min-width: 768px) {
          .hamburger {
            display: none;
          }
          
          .desktop-nav {
            display: flex;
          }

          .mobile-menu {
            display: none;
          }
        }

        @media (max-width: 767px) {
          .navbar-content {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 0.75rem 1rem;
          }

          .hamburger {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            z-index: 10;
            margin-right: 0;
          }

          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }

          .logo {
            height: 36px;
            width: auto;
          }

          .auth-section {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
          }

          .auth-section :global(.cl-userButtonBox) {
            width: 38px;
            height: 38px;
          }

          .auth-section :global(.cl-userButtonTrigger) {
            width: 38px !important;
            height: 38px !important;
          }

          .auth-section :global(.cl-avatarBox) {
            width: 38px;
            height: 38px;
          }

          .desktop-nav {
            display: none !important;
            visibility: hidden;
            height: 0;
            overflow: hidden;
          }

          .sign-in-button {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
          }

          .navbar {
            min-height: 75px;
          }

          .mobile-menu {
            top: 80px;
          }

          .logo {
            height: 55px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-content">
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="logo-container">
            <Link href={isSignedIn ? 'https://dashboard.thebettinginsider.com' : 'https://www.thebettinginsider.com'}>
              <img
                src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
                alt="The Betting Insider"
                className="logo"
              />
            </Link>
          </div>

          <div className="desktop-nav">
            {navItems.map(item => {
              if (item.type === 'premium') {
                return (
                  <div key={item.id} className="nav-item has-dropdown">
                    <span>{item.label}</span>
                    <div className="dropdown premium-dropdown">
                      <div className="premium-grid">
                        {premiumFeatures.map((feature, idx) => (
                          <Link
                            key={idx}
                            href={feature.href}
                            className="premium-card"
                          >
                            <div className="premium-card-icon-wrapper">
                              <img
                                src={feature.icon}
                                alt={feature.label}
                                className="premium-card-icon"
                              />
                            </div>
                            <div className="premium-card-text">
                              <h3 className="premium-card-label">{feature.label}</h3>
                              <p className="premium-card-description">{feature.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              if (item.type === 'free-tools') {
                return (
                  <div key={item.id} className="nav-item has-dropdown">
                    <span>{item.label}</span>
                    <div className="dropdown free-tools-dropdown">
                      <div className="free-tools-grid">
                        {freeTools.map((tool, idx) => (
                          <Link
                            key={idx}
                            href={tool.href}
                            className="free-tool-item"
                          >
                            <img
                              src={tool.icon}
                              alt={tool.label}
                              className="free-tool-icon"
                            />
                            <span className="free-tool-label">{tool.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              if (item.dropdown) {
                return (
                  <div key={item.id} className="nav-item has-dropdown">
                    <span>{item.label}</span>
                    <div className="dropdown">
                      {item.dropdown.map((dropItem, idx) => (
                        <Link
                          key={idx}
                          href={dropItem.href}
                          className="dropdown-item"
                        >
                          {dropItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>

          <div className="auth-section">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="https://www.thebettinginsider.com" />
            ) : (
              <SignInButton mode="modal">
                <button className="sign-in-button">Sign In / Up</button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems.map(item => (
            <div key={item.id} className="mobile-nav-item">
              {item.type === 'premium' ? (
                <>
                  <div
                    className="mobile-nav-link"
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.id ? null : item.id)
                    }
                  >
                    <span>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                      {openDropdown === item.id ? '▲' : '▼'}
                    </span>
                  </div>
                  <div
                    className={`mobile-dropdown ${
                      openDropdown === item.id ? 'open' : ''
                    }`}
                  >
                    <div className="mobile-premium-grid">
                      {premiumFeatures.map((feature, idx) => (
                        <Link
                          key={idx}
                          href={feature.href}
                          className="mobile-premium-card"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div className="mobile-premium-card-icon-wrapper">
                            <img
                              src={feature.icon}
                              alt={feature.label}
                              className="mobile-premium-card-icon"
                            />
                          </div>
                          <div className="mobile-premium-card-text">
                            <h4 className="mobile-premium-card-label">{feature.label}</h4>
                            <p className="mobile-premium-card-description">{feature.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : item.type === 'free-tools' ? (
                <>
                  <div
                    className="mobile-nav-link"
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.id ? null : item.id)
                    }
                  >
                    <span>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                      {openDropdown === item.id ? '▲' : '▼'}
                    </span>
                  </div>
                  <div
                    className={`mobile-dropdown ${
                      openDropdown === item.id ? 'open' : ''
                    }`}
                  >
                    <div className="mobile-free-tools-list">
                      {freeTools.map((tool, idx) => (
                        <Link
                          key={idx}
                          href={tool.href}
                          className="mobile-free-tool-item"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <img src={tool.icon} alt={tool.label} className="mobile-free-tool-icon" />
                          <span>{tool.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : item.dropdown ? (
                <>
                  <div
                    className="mobile-nav-link"
                    onClick={() =>
                      setOpenDropdown(openDropdown === item.id ? null : item.id)
                    }
                  >
                    <span>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                      {openDropdown === item.id ? '▲' : '▼'}
                    </span>
                  </div>
                  <div
                    className={`mobile-dropdown ${
                      openDropdown === item.id ? 'open' : ''
                    }`}
                  >
                    {item.dropdown.map((dropItem, idx) => (
                      <Link
                        key={idx}
                        href={dropItem.href}
                        className="mobile-dropdown-item"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {dropItem.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}