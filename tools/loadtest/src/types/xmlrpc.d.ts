declare module "xmlrpc/lib/serializer.js" {
  const serializer: {
    serializeMethodCall(method: string, params?: unknown[]): string;
    serializeMethodResponse(result: unknown): string;
    serializeFault(fault: { faultCode: number; faultString: string }): string;
  };
  export default serializer;
}

declare module "xmlrpc/lib/deserializer.js" {
  export default class Deserializer {
    constructor(encoding?: string);
    deserializeMethodCall(
      stream: NodeJS.ReadableStream,
      callback: (
        error: Error | null,
        method: string,
        params: unknown[],
      ) => void,
    ): void;
    deserializeMethodResponse(
      stream: NodeJS.ReadableStream,
      callback: (error: Error | null, result: unknown) => void,
    ): void;
  }
}

declare module "xmlrpc/lib/customtype.js" {
  export default class CustomType {
    constructor(raw: unknown);
    raw: unknown;
    tagName: string;
  }
}
