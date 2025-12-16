import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { GoogleTagManager } from '@next/third-parties/google'
import Script from 'next/script'
import ConditionalNavbar from '@/components/ConditionalNavbar'
import Footer from '@/components/Footer'
import StructuredData from '@/components/StructuredData'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://thebettinginsider.com'),
  title: {
    default: "The Betting Insider - Premium Sports Betting Analytics & AI Insights",
    template: "%s | The Betting Insider"
  },
  description: "Get expert NFL, NBA, CFB, and NHL betting picks with AI-powered analytics, real-time data, and insider insights. Join thousands of winning bettors.",
  keywords: [
    "sports betting",
    "NFL picks",
    "NBA picks", 
    "CFB picks",
    "NHL picks",
    "betting analytics",
    "AI sports betting",
    "betting insights",
    "prop bets",
    "parlay builder",
    "sports betting tips",
    "betting strategy"
  ],
  authors: [{ name: "The Betting Insider" }],
  creator: "The Betting Insider",
  publisher: "The Betting Insider",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thebettinginsider.com',
    siteName: 'The Betting Insider',
    title: 'The Betting Insider - Premium Sports Betting Analytics',
    description: 'Expert NFL, NBA, CFB, and NHL betting picks with AI-powered analytics and real-time insights.',
    images: [
      {
        url: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png',
        width: 1200,
        height: 630,
        alt: 'The Betting Insider - Sports Betting Analytics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Betting Insider - Premium Sports Betting Analytics',
    description: 'Expert NFL, NBA, CFB, and NHL betting picks with AI-powered analytics.',
    images: ['https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png'],
    creator: '@invisiblestats',
  },
  verification: {
    google: 'your-google-site-verification-code', // Replace with actual code from Google Search Console
  },
  alternates: {
    canonical: 'https://thebettinginsider.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider 
      afterSignUpUrl="/pricing"
    >
      <html lang="en">
        <head>
          <StructuredData />
          {/* Pushlap Growth Affiliate Tracker - TEMPORARILY DISABLED due to script bug */}
          {/* Contact pushlap support - their script crashes on null.substring() */}
          {/*
          <Script
            src="https://pushlapgrowth.com/affiliate-tracker.js"
            data-affiliate="true"
            data-program-id="87f11ddf-fd49-4bc3-9130-d84475a34fc1"
            strategy="afterInteractive"
          />
          */}
          {/* jQuery for Stripe Integration */}
          <Script
            src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"
            strategy="beforeInteractive"
          />
          {/* Pushlap Growth - Stripe Affiliate Data */}
          <Script id="pushlap-stripe" strategy="afterInteractive">
            {`
              $(document).ready(function() {
                setTimeout(function() {
                  $('a[href^="https://buy.stripe.com/"]').each(function() {
                    const oldUrl = $(this).attr("href");
                    const affiliateId = window.affiliateId;
                    if(!oldUrl.includes("client_reference_id")) {
                      const newUrl = oldUrl + "?client_reference_id=" + affiliateId;
                      $(this).attr("href", newUrl);
                    }
                  });
                  $("[pricing-table-id]").each(function() {
                    $(this).attr("client-reference-id", window.affiliateId);
                  });
                  $("[buy-button-id]").each(function() {
                    $(this).attr("client-reference-id", window.affiliateId);
                  });
                }, 2000);
              });
            `}
          </Script>
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <ConditionalNavbar />
          {children}
          <Footer />
          <GoogleTagManager gtmId="GTM-N78VK242" />
        </body>
      </html>
    </ClerkProvider>
  )
}