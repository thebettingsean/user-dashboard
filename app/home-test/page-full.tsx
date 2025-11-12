'use client'

import React, { useEffect, useState, useRef } from 'react'
import styles from './home-test.module.css'

export default function HomeTestPage() {
  return (
    <div className={styles.homePage}>
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <ReviewsReelSection />
    </div>
  )
}

// Hero Section Component
function HeroSection() {
  const [imageTilt, setImageTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rotateY = ((x / rect.width) - 0.5) * 6
    const rotateX = ((y / rect.height) - 0.5) * -6
    setImageTilt({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setImageTilt({ x: 0, y: 0 })
  }

  return (
    <div className={styles.heroWrapper}>
      {/* Animated Background Light Gradients */}
      <div className={styles.backgroundLights}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className={styles.lightGradient} />
        ))}
      </div>

      {/* SEO Content - Hidden but accessible to search engines */}
      <div className={styles.seoContent}>
        <h1>Best Bets Today - Elite NFL & Football Betting Tips</h1>
        <p>The Betting Insider offers the best betting sites and best bets today for football and NFL betting. Get expert NFL betting tips, football predictions, sure win predictions today, football tips, MLB predictions, and MLB predictions today from the world's best prediction site.</p>
        <p>Professional analysts provide daily best NFL bets, expert football betting tips, and sure win predictions. Access the best betting sites for NFL betting tips, football predictions, MLB predictions today, and comprehensive football tips from our expert team.</p>
        <p>Keywords: betting site, best bets, best betting sites, best bets today, football betting tips, NFL betting tips, best NFL bets, sure win predictions today, football tips, mlb predictions, mlb predictions today, sports betting predictions, daily betting tips, expert picks, professional betting advice</p>
      </div>

      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            <div className={styles.heroLeft}>
              <div className={styles.heroMiniTagline}>From the best sports bettors on the internet</div>
              
              <h1 className={styles.heroTitle}>AI BUILT FOR REAL BETTORS</h1>
              
              {/* 2x2 Square Grid Feature List with Colors */}
              <div className={styles.productFeatures}>
                <div className={`${styles.featureItem}`}>
                  <div className={styles.featureIconMinimal}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Expert Daily Picks</div>
                    <div className={styles.featureDescription}>Curated selections from pro bettors</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.green}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.green}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Public Betting Data</div>
                    <div className={styles.featureDescription}>See where the money is going</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.grey}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.grey}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Matchup Data</div>
                    <div className={styles.featureDescription}>Referee and team specific data</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.red}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.red}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Premium Tools</div>
                    <div className={styles.featureDescription}>Tools to help you bet better</div>
                  </div>
                </div>
              </div>
              
              <div className={styles.buttonGroup}>
                <a href="https://www.thebettinginsider.com/betting/dashboard" className={styles.btnBets}>
                  <svg className={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Try today for $1
                </a>
              </div>
            </div>
            
            <div className={styles.heroRight}>
              <div 
                className={styles.imageContainer}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/69038cd1c287ae9a8cdea0ec_Untitled%20design%20(55).svg"
                  alt="Dashboard Preview"
                  className={styles.dashboardImage}
                  width="1200"
                  height="900"
                  loading="eager"
                  decoding="async"
                  style={{
                    transform: `rotateX(${imageTilt.x}deg) rotateY(${imageTilt.y}deg) scale(1.02)`
                  }}
                />
              </div>
            </div>

            {/* Mobile Features */}
            <div className={styles.heroFeatures}>
              <div className={styles.productFeatures}>
                <div className={`${styles.featureItem}`}>
                  <div className={styles.featureIconMinimal}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Expert Daily Picks</div>
                    <div className={styles.featureDescription}>Curated selections from pro bettors</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.green}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.green}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Public Betting Data</div>
                    <div className={styles.featureDescription}>See where the money is going</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.grey}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.grey}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Matchup Data</div>
                    <div className={styles.featureDescription}>Referee and team specific data</div>
                  </div>
                </div>
                <div className={`${styles.featureItem} ${styles.red}`}>
                  <div className={`${styles.featureIconMinimal} ${styles.red}`}></div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureLabel}>Premium Tools</div>
                    <div className={styles.featureDescription}>Tools to help you bet better</div>
                  </div>
                </div>
              </div>
              
              <div className={styles.buttonGroup}>
                <a href="https://www.thebettinginsider.com/betting/dashboard" className={styles.btnBets}>
                  <svg className={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Try today for $1
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentions Reel Section */}
      <MentionsReel />
    </div>
  )
}

// Mentions Reel Component
function MentionsReel() {
  const mentions = [
    { name: 'Chicago Tribune', url: 'https://www.chicagotribune.com/2024/06/10/the-daily-ref-a-sports-bettors-dream/', className: styles.chicagoTribune, text: 'Chicago Tribune' },
    { name: 'THE SOURCE', url: 'https://thesource.com/2024/04/30/source-sports-money-makin-goals-the-insiders-dive-into-small-market-soccer-betting/', className: styles.theSource, text: 'THE SOURCE' },
    { name: 'Q Magazine', url: '', className: styles.qMagazine, text: 'Q' },
    { name: 'LA WEEKLY', url: 'https://www.laweekly.com/the-insiders-are-beginning-to-takeover-the-world-of-sports-betting/', className: styles.laWeekly, text: 'LA WEEKLY' },
    { name: 'TechBullion', url: 'https://techbullion.com/the-daily-ref-unlocking-the-secrets-behind-referee-involvement-in-sport-outcomes/', className: styles.techBullion, text: 'TechBullion' },
    { name: 'DAILY SCANNER', url: 'https://www.dailyscanner.com/the-insiders-social-media-takeover/', className: styles.dailyScanner, text: 'DAILY SCANNER' },
    { name: 'Whop', url: 'https://whop.com/blog/insider-betting-101/', className: styles.whop, text: 'Whop' }
  ]

  return (
    <div className={styles.mentionsReelWrapper}>
      <div className={styles.mentionsHeader}>
        <div className={styles.mentionsTitle}>Featured In</div>
      </div>
      
      <div className={styles.mentionsReelContainer}>
        <div className={styles.mentionsTrack}>
          {/* Triple the content for seamless loop */}
          {[...Array(3)].map((_, setIndex) => (
            mentions.map((mention, index) => (
              <div key={`${setIndex}-${index}`} className={styles.mentionItem}>
                {mention.url ? (
                  <a href={mention.url} target="_blank" rel="noopener noreferrer" className={styles.publicationLink}>
                    <div className={`${styles.publicationText} ${mention.className}`}>
                      {mention.name === 'LA WEEKLY' ? (
                        <>
                          <span className={styles.la}>LA</span>
                          <span className={styles.weekly}>WEEKLY</span>
                        </>
                      ) : mention.name === 'TechBullion' ? (
                        <>
                          <span className={styles.tech}>Tech</span>Bullion
                        </>
                      ) : mention.name === 'Q Magazine' ? (
                        <>
                          {mention.text}
                          <span className={styles.qMagazineAfter}>MAGAZINE</span>
                        </>
                      ) : (
                        mention.text
                      )}
                    </div>
                  </a>
                ) : (
                  <div className={`${styles.publicationText} ${mention.className}`}>
                    {mention.text}
                    {mention.name === 'Q Magazine' && (
                      <span className={styles.qMagazineAfter}>MAGAZINE</span>
                    )}
                  </div>
                )}
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  )
}

// How It Works Section Component
function HowItWorksSection() {
  const stepsRef = useRef<HTMLOListElement>(null)
  const [lineTop, setLineTop] = useState('30px')
  const [lineBottom, setLineBottom] = useState('30px')

  useEffect(() => {
    const updateLine = () => {
      if (!stepsRef.current) return
      
      const badges = stepsRef.current.querySelectorAll('.step-badge')
      if (badges.length < 2) return

      const listRect = stepsRef.current.getBoundingClientRect()
      const first = badges[0].getBoundingClientRect()
      const last = badges[badges.length - 1].getBoundingClientRect()
      
      const firstCenter = (first.top + first.height / 2) - listRect.top
      const lastCenter = (last.top + last.height / 2) - listRect.top
      
      setLineTop(`${Math.max(0, firstCenter)}px`)
      setLineBottom(`${Math.max(0, listRect.height - lastCenter)}px`)
    }

    const resizeObserver = new ResizeObserver(updateLine)
    if (stepsRef.current) {
      resizeObserver.observe(document.documentElement)
    }

    window.addEventListener('load', updateLine)
    window.addEventListener('resize', updateLine)
    requestAnimationFrame(() => requestAnimationFrame(updateLine))

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('load', updateLine)
      window.removeEventListener('resize', updateLine)
    }
  }, [])

  const steps = [
    {
      number: '1',
      title: 'Instant Dashboard Access',
      description: 'Gain instant access to our plays, the systems behind them, and breakdowns straight from our professional bettors. Each pick includes full reasoning and the data behind the bet, built to help you see the game like an insider.'
    },
    {
      number: '2',
      title: "What's Ours Is Yours",
      description: 'Access the same data we use to fuel our own bets: referee data, team trends, public money splits, and matchup-specific systems across every league. This is the foundation that fuels every single one of our own bets.'
    },
    {
      number: '3',
      title: 'Cover All Fronts',
      description: 'Crafted perfectly for those of you who like to bet small to win big. From our Prop Parlay Builder to our Anytime TD finder, our tools do the heavy lifting. Instantly compare matchups, surface profitable picks, and uncover hidden player props in seconds.'
    },
    {
      number: '4',
      title: 'We Promise Results',
      description: "Everything in our dashboard is built to deliver wins: access to our plays, all our data, and tools that surface profitable angles. We show proof behind every pick, keep score on what's working, and update daily, so you can win alongside us."
    }
  ]

  return (
    <div className={styles.howItWorksWrapper}>
      <div className={styles.howItWorksInner}>
        <div className={styles.sectionLabel}>Take Your Advantage</div>
        <h2 className={styles.sectionTitle}>Here's How It Works</h2>
        
        <ol 
          ref={stepsRef}
          className={styles.howSteps}
          style={{
            '--line-top': lineTop,
            '--line-bottom': lineBottom
          } as React.CSSProperties & Record<string, string>}
        >
          {steps.map((step, index) => (
            <StepItem 
              key={step.number} 
              step={step} 
              index={index}
            />
          ))}
        </ol>
      </div>
    </div>
  )
}

// Step Item Component
function StepItem({ step, index }: { step: { number: string; title: string; description: string }; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const stepRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    )

    const element = stepRef.current
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [])

  return (
    <li 
      ref={stepRef}
      className={`${styles.howStep} ${isVisible ? styles.animate : ''}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className={`${styles.stepBadge} ${step.number === '4' ? styles.greenBadge : ''}`}>
        {step.number}
      </div>
      <div className={styles.stepContent}>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDescription}>{step.description}</p>
      </div>
    </li>
  )
}

// Pricing Section Component
function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'season'>('weekly')
  const sliderRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLDivElement>(null)

  const weeklyButtonRef = useRef<HTMLButtonElement>(null)
  const monthlyButtonRef = useRef<HTMLButtonElement>(null)
  const seasonButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateSlider = () => {
      if (!sliderRef.current || !toggleRef.current) return
      
      const buttonRefs: Record<'weekly' | 'monthly' | 'season', React.RefObject<HTMLButtonElement | null>> = {
        weekly: weeklyButtonRef,
        monthly: monthlyButtonRef,
        season: seasonButtonRef
      }
      
      const activeButton = buttonRefs[selectedPlan]?.current
      if (!activeButton) return

      const buttons = [
        weeklyButtonRef.current,
        monthlyButtonRef.current,
        seasonButtonRef.current
      ].filter(Boolean) as HTMLElement[]
      
      const buttonIndex = buttons.indexOf(activeButton)

      let leftPosition = 0.25 * 16
      for (let i = 0; i < buttonIndex; i++) {
        leftPosition += buttons[i].offsetWidth + (0.5 * 16)
      }

      sliderRef.current.style.width = activeButton.offsetWidth + 'px'
      sliderRef.current.style.left = leftPosition + 'px'
    }

    updateSlider()
    window.addEventListener('resize', updateSlider)
    return () => window.removeEventListener('resize', updateSlider)
  }, [selectedPlan])

  const pricingPlans = [
    {
      id: 'weekly',
      title: 'Insider Weekly',
      tag: 'Try it out',
      tagClass: styles.tagTry,
      tagline: 'Full dashboard access',
      trialPrice: '$1',
      regularPrice: '$29/week',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoo07WIhZOuSIJB8OGgVU?trial=true'
    },
    {
      id: 'monthly',
      title: 'Insider Monthly',
      tag: 'Popular',
      tagClass: styles.tagPopular,
      tagline: 'Full dashboard access',
      trialPrice: '$1',
      regularPrice: '$99/month',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4?trial=true'
    },
    {
      id: 'season',
      title: 'Insider Seasonal',
      tag: 'Cheapest',
      tagClass: styles.tagCheapest,
      tagline: 'Full dashboard access',
      trialPrice: '$1',
      regularPrice: '$299/6 months',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm?trial=true'
    }
  ]

  const features = [
    'Unlimited AI game scripts',
    'ALL Insider Best Bets',
    'Historical betting data',
    'Public betting data'
  ]

  return (
    <div className={styles.pricingWrapper}>
      <div className={styles.pricingHeader}>
        <h2 className={styles.pricingTitle}>A Simple Start...</h2>
        <p className={styles.pricingTagline}>Get a 3 day trial on us!</p>
      </div>

      {/* Toggle - Mobile Only */}
      <div className={styles.toggleContainer}>
        <div ref={toggleRef} className={styles.toggleWrapper}>
          <button 
            ref={weeklyButtonRef}
            className={`${styles.toggleOption} ${selectedPlan === 'weekly' ? styles.active : ''}`}
            onClick={() => setSelectedPlan('weekly')}
          >
            Weekly
          </button>
          <button 
            ref={monthlyButtonRef}
            className={`${styles.toggleOption} ${selectedPlan === 'monthly' ? styles.active : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            Monthly
          </button>
          <button 
            ref={seasonButtonRef}
            className={`${styles.toggleOption} ${selectedPlan === 'season' ? styles.active : ''}`}
            onClick={() => setSelectedPlan('season')}
          >
            6 Months
          </button>
          <div ref={sliderRef} className={styles.toggleSlider}></div>
        </div>
      </div>

      {/* Price Cards */}
      <div className={styles.pricingContainer}>
        {pricingPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`${styles.priceCard} ${selectedPlan === plan.id ? styles.active : ''}`}
            data-plan={plan.id}
          >
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{plan.title}</h2>
              <div className={`${styles.cardTag} ${plan.tagClass}`}>{plan.tag}</div>
            </div>
            <p className={styles.cardTagline}>{plan.tagline}</p>
            
            <div className={styles.priceSection}>
              <div className={styles.priceTrial}>
                {plan.trialPrice}<span> / 3-day trial</span>
              </div>
              <div className={styles.priceRegular}>Then {plan.regularPrice}</div>
            </div>
            
            <div className={styles.featuresList}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureItem}>
                  <div className={`${styles.featureCheck} ${index === 0 ? styles.firstCheck : ''}`}>
                    <svg viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className={styles.featuresTagline}>the stuff that actually matters</div>
            
            <a href={plan.checkoutUrl} target="_blank" className={styles.ctaButton}>
              Start Winning
            </a>
          </div>
        ))}
        
        <a href="https://dashboard.thebettinginsider.com" target="_blank" className={styles.subscriberLink}>
          Already a subscriber? Go to your dashboard here
        </a>
      </div>
    </div>
  )
}

// Reviews Reel Section Component
function ReviewsReelSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const animate = () => {
      setPosition((prev: number) => {
        const cardWidth = 420 + 32 // card width + gap
        const setWidth = cardWidth * reviews.length
        
        if (Math.abs(prev) >= setWidth) {
          return 0
        }
        
        return prev - 0.5
      })
      requestAnimationFrame(animate)
    }
    
    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${position}px)`
    }
  }, [position])

  const reviews = [
    {
      name: "Sean M.",
      text: "Honestly thought I was only gonna use it for daily picks but the rest of the dashboard blew me away. The matchup and referee stats are insane, like stuff you just don't see anywhere else. It's made my NFL Sundays way more profitable.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f141a2286e558576d25c54_Untitled%20design%20(22).svg"
    },
    {
      name: "Harry R.",
      text: "Insider Mike is a legend. The dude's hit rate is unreal lately. I tail almost everything he posts and when he lines up with the ref or matchup data, it's basically auto 2 unit bet for me.",
      duration: "Member for 8 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a2d854d3970b1c5181_Untitled%20design%20(27).svg"
    },
    {
      name: "Connor M.",
      text: "Ref trends are crazy consistent. I never thought refs mattered that much until I started tracking the data here. The 80% and 74% numbers don't lie, and those patterns show up again and again.",
      duration: "Member for 6 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a16bd623f27c6d8f76_Untitled%20design%20(29).svg"
    },
    {
      name: "Ryan S.",
      text: "I used to scroll Twitter for bets, but not anymore. This has everything in one spot: public data, team trends, refs, hot bettors, all that. Feels like having a team of researchers behind me.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a247971096173b3786_Untitled%20design%20(24).svg"
    },
    {
      name: "Chris K.",
      text: "The fact that I'm only paying this much for all of these bettors is unreal. Someone is always hot, and if you just ride the hot hand, there is no way you'll lose.",
      duration: "Member for 2 years",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a1e794076e09c7e5bd_Untitled%20design%20(30).svg"
    },
    {
      name: "Hayden G.",
      text: "Didn't think I'd use all the tools, but I ended up checking them every day. I started just following picks, then I got obsessed with the team and ref matchup data. Makes betting feel like studying for an exam I actually wanna pass.",
      duration: "Member for 5 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a1140874807f125662_Untitled%20design%20(28).svg"
    },
    {
      name: "Jason L.",
      text: "I'm not super technical with stats, but Advantage makes it easy. I just follow the public money data and system notes, they hit more often than my old gut picks ever did.",
      duration: "Member for 3 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a166a6b38ccfa1c4f7_Untitled%20design%20(25).svg"
    },
    {
      name: "Saurav B.",
      text: "Been subscribed for a year and still impressed with how smooth everything runs. Support's solid, updates keep rolling in, and the results speak for themselves. It's worth sticking with.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a189fb8a9fb22ebb5b_Untitled%20design%20(23).svg"
    },
    {
      name: "Ian C.",
      text: "I started following Insider Don's picks just for fun and now I'm checking the dashboard before every game. Dude's been consistent, but what makes it hit is how it lines up with the matchup data.",
      duration: "Member for 4 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a130693673d1c74370_Untitled%20design%20(26).svg"
    }
  ]

  return (
    <div className={styles.reviewsReel}>
      <div className={styles.reviewsHeader}>
        <h2 className={styles.reviewsTitle}>What Our Members Say</h2>
      </div>
      
      <div className={styles.reviewsContainer}>
        <div ref={trackRef} className={styles.reviewsTrack}>
          {/* Triple the content for seamless loop */}
          {[...Array(3)].map((_, setIndex) => (
            reviews.map((review, index) => {
              const initials = review.name.split(' ').map(n => n[0]).join('')
              return (
                <div key={`${setIndex}-${index}`} className={styles.reviewCard}>
                  <div className={styles.reviewContent}>
                    <h3 className={styles.reviewerName}>
                      <div className={styles.profilePic}>
                        {review.profilePic ? (
                          <img src={review.profilePic} alt={review.name} />
                        ) : (
                          initials
                        )}
                      </div>
                      <span>{review.name}</span>
                    </h3>
                    <p className={styles.reviewText}>{review.text}</p>
                    <div className={styles.reviewFooter}>
                      <div className={styles.memberDuration}>{review.duration}</div>
                    </div>
                  </div>
                </div>
              )
            })
          ))}
        </div>
      </div>
    </div>
  )
}

