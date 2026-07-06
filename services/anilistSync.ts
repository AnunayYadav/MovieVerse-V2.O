const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

export interface AniListMediaItem {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    userPreferred?: string;
  };
  coverImage: {
    large?: string;
  };
  format?: string;
  episodes?: number;
}

export interface AniListEntry {
  media: AniListMediaItem;
  status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED';
}

/**
 * Fetch a user's anime list from AniList by username
 */
export async function fetchAniListUserList(username: string): Promise<AniListEntry[]> {
  const query = `
    query ($username: String) {
      MediaListCollection(userName: $username, type: ANIME) {
        lists {
          name
          status
          entries {
            media {
              id
              title {
                romaji
                english
                userPreferred
              }
              coverImage {
                large
              }
              format
              episodes
            }
            status
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Failed to fetch AniList data');
    }

    const lists = result.data?.MediaListCollection?.lists || [];
    const allEntries: AniListEntry[] = [];
    for (const list of lists) {
      if (list.entries) {
        allEntries.push(...list.entries);
      }
    }
    return allEntries;
  } catch (error) {
    console.error('Error fetching AniList user list:', error);
    throw error;
  }
}

/**
 * Sync a media item to user's AniList Planning section using developer token
 */
export async function syncWatchlistToAniList(mediaId: number, token: string): Promise<boolean> {
  const query = `
    mutation ($mediaId: Int) {
      SaveMediaListEntry(mediaId: $mediaId, status: PLANNING) {
        id
        status
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        variables: { mediaId }
      })
    });

    const result = await response.json();
    if (result.errors) {
      console.error('AniList mutation error:', result.errors);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to sync watchlist to AniList:', error);
    return false;
  }
}
