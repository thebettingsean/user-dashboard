import type { Metadata } from "next";
import { supabaseUsers } from "@/lib/supabase-users";

type Props = {
  params: Promise<{ groupId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;

  try {
    // Fetch group name
    const { data: group, error } = await supabaseUsers
      .from('nfl_playoff_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group for metadata:', error);
    }

    const groupName = group?.name?.trim() || '';
    const title = groupName 
      ? `Join ${groupName} And Make Your Picks For The 2026 NFL Playoffs!`
      : 'Join And Make Your Picks For The 2026 NFL Playoffs!';
    const description = groupName
      ? `Join ${groupName} And Make Your Picks For The 2026 NFL Playoffs!`
      : 'Join And Make Your Picks For The 2026 NFL Playoffs!';

    return {
      metadataBase: new URL('https://thebettinginsider.com'),
      title: {
        absolute: title, // Use absolute to override the template
      },
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `/nfl-playoffs/group/${groupId}`,
        siteName: 'The Betting Insider',
        locale: 'en_US',
        images: [
          {
            url: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png',
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ['https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png'],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    // Fallback metadata
    const fallbackTitle = "Join And Make Your Picks For The 2026 NFL Playoffs!";
    return {
      metadataBase: new URL('https://thebettinginsider.com'),
      title: {
        absolute: fallbackTitle, // Use absolute to override the template
      },
      description: fallbackTitle,
      openGraph: {
        title: fallbackTitle,
        description: fallbackTitle,
        type: "website",
        url: `/nfl-playoffs/group/${groupId}`,
        siteName: 'The Betting Insider',
        locale: 'en_US',
        images: [
          {
            url: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png',
            width: 1200,
            height: 630,
            alt: fallbackTitle,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackTitle,
        images: ['https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png'],
      },
    };
  }
}

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

