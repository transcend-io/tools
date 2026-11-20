/**
 * Privacy Center / action form field types (GraphQL {@link FormType}).
 */
export const FormType = {
  /** Boolean input */
  Boolean: 'boolean',
  /** Group of nested fields */
  Group: 'group',
  /** Single-line string input */
  String: 'string',
  /** Array input */
  Array: 'array',
  /** Select dropdown */
  Select: 'select',
  /** Multi-line text area */
  TextArea: 'textArea',
  /** JSON input */
  Json: 'json',
  /** Password input */
  Password: 'password',
  /** File upload */
  File: 'file',
  /** API key picker */
  SelectApiKeys: 'SelectApiKeys',
  /** User picker */
  SelectUsers: 'SelectUsers',
  /** Team picker */
  SelectTeams: 'SelectTeams',
  /** Template picker */
  SelectTemplate: 'SelectTemplate',
} as const;

/** Form field type value */
export type FormType = (typeof FormType)[keyof typeof FormType];
