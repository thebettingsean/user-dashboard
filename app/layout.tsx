import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { GoogleTagManager } from '@next/third-parties/google'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider 
      afterSignUpUrl="/pricing"
    >
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
          <Footer />
          <GoogleTagManager gtmId="GTM-N78VK242" />
        </body>
      </html>
    </ClerkProvider>
  )
}