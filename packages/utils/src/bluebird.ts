import Bluebird from 'bluebird';

/**
 * Concurrent map with configurable concurrency limit.
 * Re-export of Bluebird.map for use across the monorepo.
 */
export const map: typeof Bluebird.map = Bluebird.map.bind(Bluebird);

/**
 * Sequential map (concurrency = 1).
 * Re-export of Bluebird.mapSeries for use across the monorepo.
 */
export const mapSeries: typeof Bluebird.mapSeries = Bluebird.mapSeries.bind(Bluebird);
