export type Template = TemplateV1;
export type TemplateV1 = {
  /**
   * Human-readable template name.
   * Must be unique in local storage.
   */
  name: string;

  /**
   * Optional human-readable description.
   */
  description?: string;

  /**
   * Version of the template schema.
   */
  version: 1;

  /**
   * Unix timestamp (ms) of last update.
   */
  updated: number;

  /**
   * Whether the template is trusted.
   */
  trusted?: boolean;

  payload: {
    version: number;
    data: string;
  };
}
