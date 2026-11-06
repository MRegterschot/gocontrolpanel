import CustomType from "xmlrpc/lib/customtype.js";

// JSON can't tell 1 from 1.0, so whole numbers go out as <int>; these fields only take <double>
const DOUBLE_FIELDS: Record<string, readonly string[]> = {
  SetServerOptions: ["CallVoteRatio"],
};

function double(value: number): CustomType {
  const type = new CustomType(String(value));
  type.tagName = "double";
  return type;
}

export function encodePassthroughParams(
  method: string,
  params: unknown[],
): unknown[] {
  const fields = DOUBLE_FIELDS[method];
  const [first, ...rest] = params;
  if (!fields || !first || typeof first !== "object") return params;

  const struct = { ...(first as Record<string, unknown>) };
  for (const field of fields) {
    if (typeof struct[field] === "number")
      struct[field] = double(struct[field]);
  }
  return [struct, ...rest];
}
