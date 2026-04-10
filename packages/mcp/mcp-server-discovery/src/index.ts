export { getDiscoveryTools } from './tools/index.js';
export { DiscoveryMixin } from './graphql.js';

export { ClassifyTextSchema, type ClassifyTextInput } from './tools/discovery_classify_text.js';
export { GetScanSchema, type GetScanInput } from './tools/discovery_get_scan.js';
export { ListPluginsSchema, type ListPluginsInput } from './tools/discovery_list_plugins.js';
export { ListScansSchema, type ListScansInput } from './tools/discovery_list_scans.js';
export { NerExtractSchema, type NerExtractInput } from './tools/discovery_ner_extract.js';
export { StartScanSchema, type StartScanInput } from './tools/discovery_start_scan.js';
