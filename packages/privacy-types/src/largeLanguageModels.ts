import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/**
 * The role of the message's author. One of `system`, `user`, `assistant`
 */
export const ChatCompletionRole = makeEnum({
  System: 'system',
  User: 'user',
  Assistant: 'assistant',
});

/** Overrides type */
export type ChatCompletionRole = (typeof ChatCompletionRole)[keyof typeof ChatCompletionRole];

/**
 * The supported product areas where the prompts can be run
 */
export enum PromptRunProductArea {
  Assessments = 'assessments',
  ContractScanning = 'contractScanning',
  PromptManager = 'promptManager',
  UnstructuredDiscovery = 'unstructuredDiscovery',
  DataInventory = 'dataInventory',
  Pathfinder = 'pathfinder',
}

export const ChatCompletionMessage = t.type({
  role: valuesOf(ChatCompletionRole),
  content: t.string,
});

/** Type override */
export type ChatCompletionMessage = t.TypeOf<typeof ChatCompletionMessage>;

/**
 * LLM model clients
 */
export const LargeLanguageModelClient = makeEnum({
  OpenAi: 'openai',
  Claude: 'claude',
  Llama: 'llama',
});

/** Overrides type */
export type LargeLanguageModelClient =
  (typeof LargeLanguageModelClient)[keyof typeof LargeLanguageModelClient];
