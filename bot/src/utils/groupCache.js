import NodeCache from '@cacheable/node-cache';

// Group metadata cache with 5-minute TTL
// Only refreshed when actual group events (participants update, groups.update) occur
export const groupMetadataCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
