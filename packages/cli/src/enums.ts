import { makeEnum } from '@transcend-io/type-utils';

/** Accepted file formats for exporting resources from OneTrust */
export enum OneTrustFileFormat {
  Json = 'json',
}

/**
 * Resources that can be pulled in from OneTrust
 */
export enum OneTrustPullResource {
  Assessments = 'assessments',
}

/**
 * Where to read OneTrust resources from
 */
export enum OneTrustPullSource {
  OneTrust = 'oneTrust',
  File = 'file',
}
