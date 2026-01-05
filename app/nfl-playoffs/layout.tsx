import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFL Playoff Bracket - Make Your Picks For The 2026 NFL Playoffs",
  description: "Make Your Picks For The 2026 NFL Playoffs",
  openGraph: {
    title: "Make Your Picks For The 2026 NFL Playoffs",
    description: "Make Your Picks For The 2026 NFL Playoffs",
    type: "website",
    url: "https://thebettinginsider.com/nfl-playoffs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Make Your Picks For The 2026 NFL Playoffs",
    description: "Make Your Picks For The 2026 NFL Playoffs",
  },
};

export default function NFLPlayoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

