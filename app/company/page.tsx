'use client'

import React, { useEffect } from 'react'
import styles from './company.module.css'

export default function CompanyPage() {
  useEffect(() => {
    // Force white text color on all social links
    setTimeout(() => {
      const socialLinks = document.querySelectorAll('.social-link, .social-link span')
      socialLinks.forEach((element) => {
        const el = element as HTMLElement
        el.style.color = '#ffffff'
        el.style.setProperty('color', '#ffffff', 'important')
        el.style.webkitTextFillColor = '#ffffff'
      })
    }, 100)

    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          target.style.animationPlayState = 'running'
        }
      })
    }, observerOptions)

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.feature-card, .approach-item, .social-platform')
    animatedElements.forEach(el => {
      const element = el as HTMLElement
      element.style.animationPlayState = 'paused'
      observer.observe(el)
    })

    // Add hover effect to social links
    const socialLinks = document.querySelectorAll('.social-link')
    socialLinks.forEach((link, index) => {
      const element = link as HTMLElement
      element.style.animationDelay = `${index * 0.05}s`
    })
  }, [])

  return (
    <div className={styles.companyPage}>
      {/* Gradient Lines Background */}
      <div 
        className={styles.heroGradientLine} 
        data-direction="left" 
        data-position="high"
        style={{ 
          animationDelay: '0s, 0s, 0s',
          animationDuration: '3s, 25s, 25s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="right" 
        data-position="high"
        style={{ 
          animationDelay: '15s, 15s, 15s',
          animationDuration: '3s, 28s, 28s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="left" 
        data-position="mid"
        style={{ 
          animationDelay: '8s, 8s, 8s',
          animationDuration: '3s, 30s, 30s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="right" 
        data-position="mid"
        style={{ 
          animationDelay: '22s, 22s, 22s',
          animationDuration: '3s, 27s, 27s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="left" 
        data-position="low"
        style={{ 
          animationDelay: '12s, 12s, 12s',
          animationDuration: '3s, 26s, 26s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="right" 
        data-position="low"
        style={{ 
          animationDelay: '18s, 18s, 18s',
          animationDuration: '3s, 29s, 29s'
        } as React.CSSProperties}
      ></div>

      {/* Main Content Section */}
      <section className={styles.companySection}>
        <div className={styles.contentContainer}>
          {/* Who We Are Section */}
          <div className={styles.aboutSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionSubtitle}>Who We Are</div>
              <h2 className={styles.sectionTitle}>Built by Sports Enthusiasts, For Sports Enthusiasts</h2>
            </div>
            <p className={styles.sectionDescription}>
              We're more than just sports fans – we're a team of passionate analysts, data scientists, and betting enthusiasts who've spent years studying the game, analyzing the numbers, and finding ways to gain an edge. What started as a small group sharing insights has grown into something much bigger than we ever imagined.
            </p>
          </div>

          {/* Why We Do This Section */}
          <div className={styles.sectionHeader}>
            <div className={styles.sectionSubtitle}>Our Mission</div>
            <h2 className={styles.sectionTitle}>Why We Do This</h2>
          </div>

          <div className={styles.cardsGrid}>
            <div className={styles.featureCard}>
              <div className={styles.cardIcon}>
                <div className={styles.cardIconCustom}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 7V12C3 16.5 6.84 20.74 12 22C17.16 20.74 21 16.5 21 12V7L12 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 7V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.3"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Our History</h3>
              <p className={styles.cardDescription}>
                Insider Sports grew from a simple idea: combine our love for sports with data analysis to make smarter betting decisions. Years of experience taught us what works.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.cardIcon}>
                <div className={styles.cardIconCustom}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3H21V21H3V3Z" fill="white" fillOpacity="0.1"/>
                    <rect x="3" y="16" width="3" height="5" fill="white" fillOpacity="0.8"/>
                    <rect x="7" y="13" width="3" height="8" fill="white" fillOpacity="0.8"/>
                    <rect x="11" y="10" width="3" height="11" fill="white" fillOpacity="0.8"/>
                    <rect x="15" y="7" width="3" height="14" fill="white" fillOpacity="0.8"/>
                    <rect x="19" y="4" width="3" height="17" fill="white" fillOpacity="0.8"/>
                    <path d="M2 15L7.5 9.5L11.5 13.5L16 8L22 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7.5" cy="9.5" r="1.5" fill="white"/>
                    <circle cx="11.5" cy="13.5" r="1.5" fill="white"/>
                    <circle cx="16" cy="8" r="1.5" fill="white"/>
                    <path d="M19 2H22V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Data Backed Bets</h3>
              <p className={styles.cardDescription}>
                With the help of expert bettors and talented developers, we've built tools and models that turn raw data into actionable insights you can trust.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.cardIcon}>
                <div className={styles.cardIconCustom}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="4" r="2.5" fill="white" fillOpacity="0.5" stroke="white" strokeOpacity="0.3" strokeWidth="0.5"/>
                    <path d="M8 9C8 9 8 7 12 7C16 7 16 9 16 9V11H8V9Z" fill="white" fillOpacity="0.5" stroke="white" strokeOpacity="0.3" strokeWidth="0.5"/>
                    <circle cx="7" cy="9" r="3" fill="white" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                    <path d="M2 18C2 18 2 15 7 15C12 15 12 18 12 18V21H2V18Z" fill="white" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                    <circle cx="17" cy="9" r="3" fill="white" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                    <path d="M12 18C12 18 12 15 17 15C22 15 22 18 22 18V21H12V18Z" fill="white" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Community</h3>
              <p className={styles.cardDescription}>
                When we first started, we opened the Insider discord community, and people loved the trends and picks we shared. It grew much bigger than we imagined.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.cardIcon}>
                <div className={styles.cardIconCustom}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 3L13 9L19 9L12 21L12 13L5 13L13 3Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="5" cy="5" r="2" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1"/>
                    <circle cx="19" cy="5" r="2" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1"/>
                    <circle cx="5" cy="19" r="2" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1"/>
                    <circle cx="19" cy="19" r="2" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Connect with Others</h3>
              <p className={styles.cardDescription}>
                We'll never stop sharing valuable sports betting insights through social media and our free discord. The sports book titans we're up against are strong, but we know that if we continue producing for our people, we can give us and our community a better shot at winning.
              </p>
            </div>
          </div>

          {/* Our Approach Section */}
          <div className={styles.approachSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionSubtitle}>Our Philosophy</div>
              <h2 className={styles.sectionTitle}>How We're Different</h2>
            </div>
            <ul className={styles.approachList}>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Thorough analysis over quick picks</span>
              </li>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Building a supportive community</span>
              </li>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Sharing knowledge, not gatekeeping</span>
              </li>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Continuous improvement and adaptation</span>
              </li>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Making sports betting more accessible</span>
              </li>
              <li className={styles.approachItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Keeping it fun while being serious about results</span>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div className={styles.communitySection}>
            <div className={styles.sectionSubtitle}>Join Our Community</div>
            <div className={styles.bigNumber}>100K+</div>
            <h2 className={styles.sectionTitle}>Bettors Have Profited Through Our Content</h2>
            <a href="/betting/about#pricing-plans" className={styles.ctaButton}>Join Now</a>
          </div>

          {/* Social Section */}
          <div className={styles.socialSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionSubtitle}>Stay Connected</div>
              <h2 className={styles.sectionTitle}>Follow Our Socials</h2>
            </div>
            <div className={styles.socialPlatforms}>
              {/* Instagram */}
              <div className={styles.socialPlatform}>
                <div className={styles.platformHeader}>
                  <div className={styles.platformIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none"/>
                      <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                    </svg>
                  </div>
                  <span className={styles.platformName}>Instagram</span>
                </div>
                <div className={styles.socialLinks}>
                  <a href="https://www.instagram.com/invisibleinsiderstats/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@invisibleinsiderstats</span>
                  </a>
                  <a href="https://www.instagram.com/player.props/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@player.props</span>
                  </a>
                  <a href="https://www.instagram.com/goodelleaks/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@goodelleaks</span>
                  </a>
                  <a href="https://www.instagram.com/dailyreferee/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@dailyreferee</span>
                  </a>
                </div>
              </div>

              {/* X/Twitter */}
              <div className={styles.socialPlatform}>
                <div className={styles.platformHeader}>
                  <div className={styles.platformIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
                    </svg>
                  </div>
                  <span className={styles.platformName}>X / Twitter</span>
                </div>
                <div className={styles.socialLinks}>
                  <a href="https://x.com/invisiblestats" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@invisiblestats</span>
                  </a>
                  <a href="https://x.com/refereeinsider" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@refereeinsider</span>
                  </a>
                  <a href="https://x.com/insiderstats_" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@insiderstats_</span>
                  </a>
                </div>
              </div>

              {/* TikTok */}
              <div className={styles.socialPlatform}>
                <div className={styles.platformHeader}>
                  <div className={styles.platformIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="white"/>
                    </svg>
                  </div>
                  <span className={styles.platformName}>TikTok</span>
                </div>
                <div className={styles.socialLinks}>
                  <a href="https://www.tiktok.com/@invisibleinsiderstats" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span>@invisibleinsiderstats</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Closing Section */}
          <div className={styles.closingSection}>
            <h2 className={styles.sectionTitle}>Ready to Level Up Your Game?</h2>
            <p className={styles.sectionDescription}>
              Join thousands of smart bettors who trust Insider Sports for their daily picks and analysis.
            </p>
            <div className={styles.closingButtons}>
              <a href="/betting/about#pricing-plans" className={styles.ctaButton}>Get Started Today</a>
              <a href="#" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>Join Free Discord</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

