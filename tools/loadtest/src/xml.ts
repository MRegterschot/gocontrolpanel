import { Readable } from "node:stream";
import Deserializer from "xmlrpc/lib/deserializer.js";
import Serializer from "xmlrpc/lib/serializer.js";

export const FAULT_UNKNOWN_METHOD = -1000;

export class Fault extends Error {
  constructor(
    public readonly faultCode: number,
    public readonly faultString: string,
  ) {
    super(faultString);
  }
}

export const methodCall = (name: string, params: unknown[]) =>
  Serializer.serializeMethodCall(name, params);
export const methodResponse = (value: unknown) =>
  Serializer.serializeMethodResponse(value);
export const faultResponse = (code: number, text: string) =>
  Serializer.serializeFault({ faultCode: code, faultString: text });

export function parseMethodCall(
  xml: string,
): Promise<{ method: string; params: unknown[] }> {
  return new Promise((resolve, reject) => {
    new Deserializer("utf-8").deserializeMethodCall(
      Readable.from([Buffer.from(xml, "utf8")]),
      (error, method, params) =>
        error ? reject(error) : resolve({ method, params: params ?? [] }),
    );
  });
}
