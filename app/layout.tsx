import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import type { Appearance } from '@clerk/types'
import type { LocalizationResource } from '@clerk/types'
import { GoogleTagManager } from '@next/third-parties/google'
import Script from 'next/script'
import Navbar from '@/components/Navbar'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Betting Insider - Dashboard",
  description: "Premium NFL betting insights and analytics",
  themeColor: "#0f172a",
};

const clerkAppearance: Appearance = {
  baseTheme: 'dark',
  variables: {
    colorBackground: '#050e1f',
    colorText: '#f8fafc',
    colorPrimary: '#6366f1',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  layout: {
    logoImageUrl:
      'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg',
    socialButtonsPlacement: 'bottom',
    helpPageUrl: undefined
  },
  elements: {
    rootBox: 'backdrop-blur-xl',
    modalBackdrop: 'backdrop-blur-md bg-black/70',
    card:
      'bg-[#0a152b]/95 border border-white/10 shadow-[0_40px_120px_rgba(3,7,18,0.8)] rounded-2xl',
    headerTitle: 'text-white text-2xl font-semibold tracking-tight text-center',
    headerSubtitle: 'text-slate-400 text-base text-center mt-1',
    logoImage: 'mx-auto mb-4 h-10 w-auto',
    socialButtonsBlockButton:
      'bg-[#111b2d] text-slate-100 border border-white/10 hover:bg-[#192642] transition',
    socialButtonsBlockButtonText: 'font-medium',
    socialButtonsBlockButton__discord: 'hidden',
    formFieldLabel: 'text-slate-300 text-sm font-medium',
    formFieldInput:
      'bg-[#0d1a33] border border-white/10 text-white placeholder:text-slate-500 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/40',
    formFieldInputShowPasswordButton: 'text-slate-400 hover:text-white',
    formButtonPrimary:
      'bg-[#6366f1] hover:bg-[#4f46e5] transition text-white font-semibold shadow-[0_12px_60px_rgba(99,102,241,0.45)]',
    footerActionText: 'text-slate-400',
    footerActionLink: 'text-[#8b5cf6] hover:text-[#a78bfa]',
    footer: 'text-center',
    dividerLine: 'bg-white/10',
    dividerText: 'text-slate-400',
    alert: 'bg-[#1a2540] border border-white/10 text-slate-200',
    badge: 'bg-[#6366f1]/20 text-[#c7d2fe]',
    identityPreviewEditButton: 'text-[#8b5cf6] hover:text-[#a78bfa]'
  }
}

const clerkLocalization: LocalizationResource = {
  signIn: {
    start: {
      title: 'Welcome to The Betting Insider!',
      subtitle: 'Please sign in or sign up to continue.'
    },
    socialButtons: {
      dividerText: 'or'
    },
    socialButtonsBlockButton: {
      google: 'Continue with Google'
    },
    password: {
      forgotPasswordTitle: 'Forgot your password?'
    },
    footerActionLink: 'Sign up'
  },
  signUp: {
    start: {
      title: 'Join The Betting Insider',
      subtitle: 'Create your account to unlock every pick, script, and tool.'
    },
    socialButtons: {
      dividerText: 'or'
    },
    socialButtonsBlockButton: {
      google: 'Continue with Google'
    },
    footerActionLink: 'Sign in'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      <html lang="en">
        <head>
          {/* Pushlap Growth Affiliate Tracker */}
          <Script
            src="https://pushlapgrowth.com/affiliate-tracker.js"
            data-affiliate="true"
            data-program-id="87f11ddf-fd49-4bc3-9130-d84475a34fc1"
            strategy="afterInteractive"
          />
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
          <Navbar />
          {children}
          <GoogleTagManager gtmId="GTM-N78VK242" />
        </body>
      </html>
    </ClerkProvider>
  )
}