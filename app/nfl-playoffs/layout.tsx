import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFL Playoff Bracket - Make Your Picks For The 2026 NFL Playoffs",
  description: "Make Your Picks For The 2026 NFL Playoffs",
  openGraph: {
    title: "Make Your Picks For The 2026 NFL Playoffs",
    description: "Make Your Picks For The 2026 NFL Playoffs",
    type: "website",
    url: "https://thebettinginsider.com/nfl-playoffs",
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
    card: "summary_large_image",
    title: "Make Your Picks For The 2026 NFL Playoffs",
    description: "Make Your Picks For The 2026 NFL Playoffs",
    images: ['https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png'],
  },
};

export default function NFLPlayoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

