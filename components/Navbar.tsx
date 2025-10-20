'use client'

import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dashboardSubOpen, setDashboardSubOpen] = useState(false)

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

  // Dashboard quick jump links - order matches the widgets on the dashboard
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
        { label: 'Your Dashboard', href: 'https://dashboard.thebettinginsider.com', hasSubDropdown: true },
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
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(50px) saturate(180%);
          -webkit-backdrop-filter: blur(50px) saturate(180%);
          border: none;
          border-radius: 16px;
          padding: 0.75rem 0;
          min-width: 220px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.5), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: none;
          border-radius: 16px;
          padding: 0;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .premium-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .premium-card-icon-wrapper {
          width: 100%;
          height: 80px;
          overflow: hidden;
          border-radius: 16px 16px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
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
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 0 0 16px 16px;
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.2);
        }

        .free-tool-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.3);
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
          position: relative;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }

        .dropdown-item.has-sub {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dropdown-item.has-sub::after {
          content: '▶';
          font-size: 0.65rem;
          opacity: 0.6;
          margin-left: 1rem;
        }

        /* Dashboard sub-dropdown */
        .dashboard-subdropdown {
          position: absolute;
          left: 100%;
          top: -0.75rem;
          margin-left: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(50px) saturate(180%);
          -webkit-backdrop-filter: blur(50px) saturate(180%);
          border: none;
          border-radius: 16px;
          padding: 0.75rem 0;
          min-width: 220px;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.5), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .dropdown-item.has-sub:hover .dashboard-subdropdown {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        .subdropdown-header {
          padding: 0.5rem 1.25rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 0.25rem;
        }

        .subdropdown-item {
          display: block;
          padding: 0.75rem 1.25rem;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .subdropdown-item:hover {
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
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.65rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.25), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .sign-in-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .mobile-menu {
          position: absolute;
          top: 90px;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(100px) saturate(180%);
          -webkit-backdrop-filter: blur(100px) saturate(180%);
          border-bottom: none;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 900;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(80px) saturate(180%);
          -webkit-backdrop-filter: blur(80px) saturate(180%);
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s;
        }

        .mobile-dropdown.open {
          max-height: 800px;
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

        .mobile-dropdown-item.has-sub {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Mobile dashboard sub-dropdown */
        .mobile-dashboard-subdropdown {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(80px) saturate(180%);
          -webkit-backdrop-filter: blur(80px) saturate(180%);
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s;
        }

        .mobile-dashboard-subdropdown.open {
          max-height: 600px;
        }

        .mobile-subdropdown-header {
          padding: 0.75rem 1.5rem 0.5rem 4rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mobile-subdropdown-item {
          display: block;
          padding: 0.75rem 1.5rem 0.75rem 4rem;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.2s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-subdropdown-item:last-child {
          border-bottom: none;
        }

        .mobile-subdropdown-item:hover {
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
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: none;
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-premium-card-icon-wrapper {
          width: 100%;
          height: 60px;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-premium-card-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .mobile-premium-card-text {
          padding: 0.5rem 0.6rem;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 0 0 12px 12px;
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
          background: rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(80px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(80px) saturate(180%) !important;
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

      <nav 
        className="navbar"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.15)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          minHeight: '85px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 4px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          willChange: 'backdrop-filter',
          transform: 'translateZ(0)'
        }}
      >
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
                      {item.dropdown.map((dropItem, idx) => {
                        if (dropItem.hasSubDropdown) {
                          return (
                            <div
                              key={idx}
                              className="dropdown-item has-sub"
                            >
                              {dropItem.label}
                              <div className="dashboard-subdropdown">
                                <div className="subdropdown-header">Quick jump to...</div>
                                {dashboardLinks.map((link, linkIdx) => (
                                  <Link
                                    key={linkIdx}
                                    href={link.href}
                                    className="subdropdown-item"
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <Link
                            key={idx}
                            href={dropItem.href}
                            className="dropdown-item"
                          >
                            {dropItem.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>

          <div className="auth-section">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="https://www.thebettinginsider.com">
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Manage Subscription"
                    labelIcon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                    }
                    href="https://billing.stripe.com/p/login/cN2eYg15W3W77rW288"
                  />
                </UserButton.MenuItems>
              </UserButton>
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
                    {item.dropdown.map((dropItem, idx) => {
                      if (dropItem.hasSubDropdown) {
                        return (
                          <div key={idx}>
                            <div
                              className="mobile-dropdown-item has-sub"
                              onClick={() => setDashboardSubOpen(!dashboardSubOpen)}
                            >
                              <span>{dropItem.label}</span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                {dashboardSubOpen ? '▲' : '▼'}
                              </span>
                            </div>
                            <div className={`mobile-dashboard-subdropdown ${dashboardSubOpen ? 'open' : ''}`}>
                              <div className="mobile-subdropdown-header">Quick jump to...</div>
                              {dashboardLinks.map((link, linkIdx) => (
                                <Link
                                  key={linkIdx}
                                  href={link.href}
                                  className="mobile-subdropdown-item"
                                  onClick={() => {
                                    setMobileMenuOpen(false)
                                    setDashboardSubOpen(false)
                                  }}
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      return (
                        <Link
                          key={idx}
                          href={dropItem.href}
                          className="mobile-dropdown-item"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {dropItem.label}
                        </Link>
                      )
                    })}
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
