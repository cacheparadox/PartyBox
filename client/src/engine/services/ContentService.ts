import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { ContentPackId, ContentEntry, ContentEntryType } from '../../../../shared/src/index';
import { DEFAULT_CONTENT } from './DefaultContent';

/**
 * Fetches content entries from Firestore for the given packs and entry type.
 * Falls back gracefully if a pack has no entries.
 */
export async function getContentEntries(
  packs: ContentPackId[],
  type: ContentEntryType
): Promise<ContentEntry[]> {
  const results: ContentEntry[] = [];

  for (const packId of packs) {
    const q = query(
      collection(db, 'contentPacks', packId, 'entries'),
      where('type', '==', type),
      limit(200)
    );
    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      results.push(doc.data() as ContentEntry);
    });
  }

  // Fallback to default content if Firestore is empty or no packs selected
  if (results.length === 0) {
    return DEFAULT_CONTENT.filter(entry => entry.type === type);
  }

  return results;
}

/**
 * Get a random entry from the given packs and type.
 */
export async function getRandomEntry(
  packs: ContentPackId[],
  type: ContentEntryType
): Promise<ContentEntry | null> {
  const all = await getContentEntries(packs, type);
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}
