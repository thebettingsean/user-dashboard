'use client'

import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const { isSignedIn } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const navItems = [
    {
      id: 'dashboard',
      label: 'Your Dashboard',
      href: '/',
      showOnlyWhenSignedIn: true
    },
    {
      id: 'picks',
      label: "Today's Picks",
      href: '#',
      dropdown: [
        { label: 'About', href: '#' },
        { label: 'Dashboard', href: '#' }
      ]
    },
    {
      id: 'trends',
      label: 'Top Betting Trends',
      href: '#',
      dropdown: [
        { label: 'About', href: '#' },
        { label: 'Dashboard', href: '#' }
      ]
    },
    {
      id: 'tools',
      label: 'Premium Tools',
      href: '#'
    },
    {
      id: 'fantasy',
      label: 'Fantasy Football',
      href: '#',
      dropdown: [
        { label: 'About', href: '#' },
        { label: 'Pre-Draft', href: '#' },
        { label: 'Start / Sit', href: '#' }
      ]
    },
    {
      id: 'company',
      label: 'Company',
      href: '#',
      dropdown: [
        { label: 'Contact', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'About', href: '#' },
        { label: "FAQ's", href: '#' }
      ]
    }
  ]

  const filteredNavItems = navItems.filter(item => {
    if (item.showOnlyWhenSignedIn) {
      return isSignedIn
    }
    return true
  })

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
        }
        
        .navbar-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-container {
          display: flex;
          align-items: center;
        }

        .logo {
          height: 70px;
          width: auto;
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
          transition: color 0.2s;
          cursor: pointer;
          white-space: nowrap;
        }

        .nav-item:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .nav-item.has-dropdown::after {
          content: '▼';
          margin-left: 0.4rem;
          font-size: 0.7rem;
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
          min-width: 180px;
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
          display: block;
          position: fixed;
          top: 65px;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.98);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          max-height: calc(100vh - 65px);
          overflow-y: auto;
          transform: translateY(-100%);
          transition: transform 0.3s;
          backdrop-filter: blur(10px);
        }

        .mobile-menu.open {
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
          max-height: 500px;
        }

        .mobile-dropdown-item {
          display: block;
          padding: 0.75rem 1.5rem 0.75rem 3rem;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.9rem;
        }

        .mobile-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
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
            padding: 0.75rem 1rem;
          }

          .logo {
            height: 40px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo-container">
            <button 
              className="hamburger" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <Link href="/">
              <img 
                src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
                alt="The Betting Insider"
                className="logo"
              />
            </Link>
          </div>

          <div className="desktop-nav">
            {filteredNavItems.map(item => (
              item.dropdown ? (
                <div key={item.id} className="nav-item has-dropdown">
                  <span>{item.label}</span>
                  <div className="dropdown">
                    {item.dropdown.map((dropItem, idx) => (
                      <Link key={idx} href={dropItem.href} className="dropdown-item">
                        {dropItem.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={item.id} href={item.href} className="nav-item">
                  {item.label}
                </Link>
              )
            ))}
          </div>

          <div className="auth-section">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <button className="sign-in-button">Sign In / Up</button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {filteredNavItems.map(item => (
            <div key={item.id} className="mobile-nav-item">
              {item.dropdown ? (
                <>
                  <div 
                    className="mobile-nav-link"
                    onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                  >
                    <span>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                      {openDropdown === item.id ? '▲' : '▼'}
                    </span>
                  </div>
                  <div className={`mobile-dropdown ${openDropdown === item.id ? 'open' : ''}`}>
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
              ) : (
                <Link 
                  href={item.href} 
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}