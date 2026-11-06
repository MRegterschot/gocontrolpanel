declare module "xmlrpc/lib/customtype.js" {
  export default class CustomType {
    constructor(raw: unknown);
    raw: unknown;
    tagName: string;
  }
}
