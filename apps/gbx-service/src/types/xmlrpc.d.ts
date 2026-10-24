declare module "xmlrpc/lib/customtype" {
  export default class CustomType {
    constructor(raw: unknown);
    raw: unknown;
    tagName: string;
  }
}
