'use client'

import React, { useState, useEffect, useRef } from 'react'
import styles from './faq.module.css'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  id: string
  name: string
  items: FAQItem[]
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const ctaRef = useRef<HTMLDivElement>(null)

  const faqCategories: FAQCategory[] = [
    {
      id: 'general',
      name: 'General',
      items: [
        {
          question: 'What are the different subscription packages?',
          answer: 'We offer three main subscription packages: Insider Weekly ($29/week), Insider Monthly ($99/month), and Insider Seasonal ($299/6 months). All packages include full dashboard access with unlimited AI game scripts, all Insider best bets, historical betting data, and public betting data. Each package starts with a $1, 3-day trial period.'
        },
        {
          question: 'How do I manage my subscription?',
          answer: 'You can manage your subscription by logging into your dashboard at dashboard.thebettinginsider.com. Once signed in, click "Manage Subscription" to upgrade, cancel, pause, or reactivate your subscription. You can also connect your Discord account from the same dashboard by selecting "connect account" in your profile settings.'
        },
        {
          question: 'Will I win every bet?',
          answer: 'No - We won\'t promise that you\'ll win every bet, or every day. That isn\'t the reality of sports betting, even for the best in the business. However, you are significantly more likely to win each bet if you have access to our dashboard and use the data we provide to make informed decisions.'
        },
        {
          question: 'How do I access the dashboard?',
          answer: 'Once you subscribe, you\'ll automatically have access to the dashboard at dashboard.thebettinginsider.com. Simply sign in with your account credentials and you\'ll have full access to all features including analyst picks, public betting data, matchup data, prop insights, referee trends, and AI game scripts.'
        },
        {
          question: 'What is the trial period?',
          answer: 'All subscriptions start with a $1, 3-day trial period. During this trial, you have full access to all dashboard features. After the 3-day trial ends, you\'ll be automatically charged the full subscription price. You can cancel anytime during the trial period to avoid being charged.'
        }
      ]
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      items: [
        {
          question: 'What features are included in the dashboard?',
          answer: 'The dashboard includes: Analyst Picks (expert picks backed by data), Public Betting (see where the money is going across 30+ sportsbooks), Matchup Data (detailed team statistics and trends), Prop Data (player prop insights and angles), Referee Trends (historical referee data), Fantasy Football tools (Start/Sit, Waiver, Trade recommendations), AI Game Scripts (unlimited AI-generated game analysis), and The Weekly Report (comprehensive weekly betting insights).'
        },
        {
          question: 'When are picks and data updated?',
          answer: 'The dashboard is updated throughout the day. Most analyst picks and bets are updated by 3pm EST, with additional updates as games approach. Public betting data, matchup stats, and referee trends are updated in real-time as new information becomes available.'
        },
        {
          question: 'What are AI Game Scripts?',
          answer: 'AI Game Scripts are AI-generated game analysis powered by GPT-5, trained on 3,000+ expert write-ups. These scripts provide comprehensive game analysis including team strengths, weaknesses, key matchups, betting angles, and predictions. You have unlimited access to generate scripts for any game across major sports.'
        },
        {
          question: 'How do I use the Public Betting data?',
          answer: 'Public Betting data shows you where the money is going across 30+ sportsbooks. This includes line movement, public betting percentages, and sharp money indicators. Use this data to identify reverse line movement (when the line moves against public betting), which often indicates sharp money and can be a valuable betting signal.'
        },
        {
          question: 'What is Matchup Data?',
          answer: 'Matchup Data provides detailed team-specific statistics and trends for every game. This includes offensive and defensive ratings, pace of play, recent performance trends, head-to-head history, and key player matchups. This data helps you make informed decisions on spreads, totals, and player props.'
        },
        {
          question: 'How do Referee Trends work?',
          answer: 'Referee Trends show historical performance data for specific referees, including how teams perform under different officials. This includes scoring trends, foul rates, and how certain teams match up with specific referees. This data is particularly valuable for totals and certain prop bets.'
        }
      ]
    },
    {
      id: 'tools',
      name: 'Tools & Free Content',
      items: [
        {
          question: 'What tools are free?',
          answer: 'We offer several free tools including: Perfect Parlays (parlay builder tool), Top TD Leaders (anytime touchdown data), Bankroll Builder (create a betting bankroll strategy), ROI Calculator (calculate return on investment), Betting Guide (complete betting education), and Top Rated Books (sportsbook recommendations). All tools are completely free and accessible without a subscription.'
        },
        {
          question: 'What is the difference between free tools and dashboard features?',
          answer: 'Free tools are general betting calculators and educational resources that help refine your overall betting strategy. Dashboard features are game-specific, real-time data including analyst picks, public betting indicators, matchup statistics, referee trends, and AI-generated game analysis. Dashboard features require a subscription, while tools are free for everyone.'
        },
        {
          question: 'Do you offer free stats or picks?',
          answer: 'Yes! We release one full game of stats for free every day for non-subscribers. This includes matchup data, public betting indicators, and referee trends for one featured game. You can also access all our free tools and educational content without a subscription.'
        },
        {
          question: 'What is the Betting Guide?',
          answer: 'The Betting Guide is a comprehensive, free educational resource covering everything from unit sizing and bankroll management to line shopping, implied odds, reverse line movement, and profitable betting strategies. It\'s designed to help both beginners and experienced bettors improve their betting approach.'
        }
      ]
    },
    {
      id: 'subscription',
      name: 'Subscription',
      items: [
        {
          question: 'How do I cancel my subscription?',
          answer: 'You can cancel your subscription anytime by logging into your dashboard at dashboard.thebettinginsider.com and clicking "Manage Subscription". From there, select "Cancel Subscription". You\'ll continue to have access until the end of your current billing period. Cancellations take effect at the end of your paid period, not immediately.'
        },
        {
          question: 'Can I pause my subscription?',
          answer: 'Yes! You can pause your subscription from the "Manage Subscription" page in your dashboard. When paused, your subscription will not renew, but you\'ll maintain access until the end of your current billing period. You can reactivate your subscription at any time.'
        },
        {
          question: 'Can I upgrade or downgrade my subscription?',
          answer: 'Yes, you can upgrade your subscription at any time from the "Manage Subscription" page. Upgrades take effect immediately, and you\'ll be charged the prorated difference. Currently, we only offer upgrades to longer-term plans (weekly to monthly, monthly to 6-month).'
        },
        {
          question: 'What happens if I forget to cancel during the trial?',
          answer: 'If you don\'t cancel before your 3-day trial ends, you\'ll be automatically charged the full subscription price. We do not offer refunds for users who forget to cancel during the trial period, as these terms are clearly disclosed during signup. We recommend setting a reminder to cancel if you don\'t wish to continue.'
        },
        {
          question: 'Do subscriptions auto-renew?',
          answer: 'Yes, all subscriptions automatically renew at the end of each billing period (weekly, monthly, or 6-month) unless you cancel. You can cancel anytime from your dashboard, and your access will continue until the end of your current paid period.'
        }
      ]
    }
  ]

  const currentCategory = faqCategories.find(cat => cat.id === activeCategory) || faqCategories[0]

  // Scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            setTimeout(() => {
              target.classList.add(styles.animate)
            }, 100)
            observer.unobserve(target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (ctaRef.current) {
      observer.observe(ctaRef.current)
    }

    return () => {
      if (ctaRef.current) observer.unobserve(ctaRef.current)
    }
  }, [])

  return (
    <div className={styles.faqGrid}>
      {/* Category Tabs */}
      <div className={styles.faqCategories}>
        {faqCategories.map((category) => (
          <button
            key={category.id}
            className={`${styles.categoryTab} ${activeCategory === category.id ? styles.active : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* FAQ Items - Simple Text Format */}
      <section className={styles.faqItemsSection}>
        <div className={styles.faqList}>
          {currentCategory.items.map((item, index) => (
            <div key={index} className={`${styles.faqItem} ${styles.animate}`}>
              <h3 className={styles.faqQuestion}>{item.question}</h3>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Us Section */}
      <section ref={ctaRef} className={styles.faqCta}>
        <h3>Still have questions?</h3>
        <p>Can't find what you're looking for? Reach out to our support team and we'll get back to you within 48 hours.</p>
        <div className={styles.contactInfo}>
          <a href="mailto:support@thebettinginsider.com" className={styles.contactEmail}>
            support@thebettinginsider.com
          </a>
          <a href="/contact" className={styles.contactLink}>
            Visit Contact Page
          </a>
        </div>
      </section>
    </div>
  )
}
