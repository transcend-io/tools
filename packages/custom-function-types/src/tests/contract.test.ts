import type { RequestAction } from '@transcend-io/privacy-types';
import { describe, expectTypeOf, it } from 'vitest';

import type { CustomFunction } from '../index.js';

type IsOptional<T, K extends keyof T> = object extends Pick<T, K> ? true : false;

describe('Custom Function authoring contract', () => {
  it('tracks the public privacy request actions', () => {
    // Why: request handlers must recognize the same actions as Transcend.
    // Given: the published privacy request action contract.
    // When: the Custom Function request action type is compared with it.
    // Then: both action sets are identical.
    expectTypeOf<CustomFunction.RequestAction>().toEqualTypeOf<RequestAction>();
  });

  it('exposes the established handler argument', () => {
    // Why: existing customer functions rely on these injected services.
    // Given: the default Custom Function argument.
    // When: its keys and service types are inspected.
    // Then: it exposes exactly the established argument contract.
    expectTypeOf<keyof CustomFunction.Argument>().toEqualTypeOf<
      'environment' | 'payload' | 'sdk' | 'kv'
    >();
    expectTypeOf<CustomFunction.Argument>().toMatchTypeOf<{
      environment: Record<string, string>;
      kv: CustomFunction.KV;
      sdk: CustomFunction.SDK;
    }>();
  });

  it('exposes the established data subject request fields', () => {
    // Why: existing customer code must keep compiling against the public payload.
    // Given: the data subject request contract available in the editor.
    // When: compatibility-sensitive fields are inspected.
    // Then: their types and optionality remain unchanged.
    expectTypeOf<CustomFunction.RequestOrigin>().toEqualTypeOf<
      'PRIVACY_CENTER' | 'ADMIN_DASHBOARD' | 'API' | 'SHOPIFY'
    >();
    expectTypeOf<CustomFunction.Request['attributes']>().toEqualTypeOf<
      CustomFunction.RequestAttribute[] | undefined
    >();
    expectTypeOf<CustomFunction.RequestAttribute['key']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CustomFunction.RequestAttribute['values']>().toEqualTypeOf<
      [string, ...string[]] | undefined
    >();
    expectTypeOf<CustomFunction.Profile['type']>().toEqualTypeOf<string>();
    expectTypeOf<CustomFunction.DataPointResolverProperties['extras']['pollId']>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<
      IsOptional<CustomFunction.DataPointResolverProperties['extras'], 'pollId'>
    >().toEqualTypeOf<false>();
    expectTypeOf<CustomFunction.PreferenceChoice['selectValue']>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<keyof CustomFunction.PurposeChange>().toEqualTypeOf<
      'purpose' | 'enabled' | 'preferences'
    >();
    expectTypeOf<keyof CustomFunction.EnricherResolverProperties['extras']>().toEqualTypeOf<
      'request' | 'organization' | 'purpose' | 'enricher' | 'identifier' | 'requestEnricherId'
    >();
  });

  it('makes Transcend-provided identifiers optional in test payloads', () => {
    // Why: local test payloads may omit values added during execution.
    // Given: datapoint and General test payload contracts.
    // When: their core identifier fields are inspected.
    // Then: both accept an omitted identifier.
    expectTypeOf<CustomFunction.DataPointTestPayload['coreIdentifier']>().toEqualTypeOf<
      CustomFunction.CoreIdentifier | undefined
    >();
    expectTypeOf<CustomFunction.MaestroTestPayload['coreIdentifier']>().toEqualTypeOf<
      CustomFunction.CoreIdentifier | undefined
    >();
  });

  it('allows test input accepted before runtime normalization', () => {
    // Why: local tests accept routing fields before Transcend prepares the payload.
    // Given: datapoint and request-enricher test payloads.
    // When: pre-execution fields are inspected.
    // Then: optional profile, integration, and polling values are accepted.
    expectTypeOf<CustomFunction.DataPointTestPayload['extras']['profile']['type']>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<CustomFunction.EnricherTestPayload['extras']['dataSilo']>().toEqualTypeOf<
      CustomFunction.DataSilo | undefined
    >();
    expectTypeOf<
      IsOptional<CustomFunction.DataPointTestPayload['extras'], 'pollId'>
    >().toEqualTypeOf<true>();
  });
});
