import { PersistedState } from '@transcend-io/persisted-state';
import type * as t from 'io-ts';

/** Factory capability used to create persisted request state. */
export type CreatePersistedState = <TStateCodec extends t.Any>(
  saveStatePath: string,
  stateCodec: TStateCodec,
  defaultState: t.TypeOf<TStateCodec>,
) => PersistedState<TStateCodec>;

/**
 * Production adapter for persisted request state.
 *
 * @param saveStatePath - File used to save state.
 * @param stateCodec - Codec used to validate state.
 * @param defaultState - Initial state when no cache exists.
 * @returns Persisted state instance.
 */
export const createPersistedState: CreatePersistedState = (
  saveStatePath,
  stateCodec,
  defaultState,
) => new PersistedState(saveStatePath, stateCodec, defaultState);
