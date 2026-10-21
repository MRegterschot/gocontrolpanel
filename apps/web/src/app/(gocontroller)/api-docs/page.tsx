import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { API_KEY_SCOPE_DESCRIPTIONS, API_KEY_SCOPES } from "@gcp/shared";
import { type ApiEndpoint, publicApiEndpoints } from "@gcp/shared/public-api";
import Link from "next/link";
import { z } from "zod/v4";

type JsonSchema = {
  type?: string | string[];
  description?: string;
  default?: unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

interface Field {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

// The top-level fields of an object schema, for the parameter tables
function fieldsOf(schema: z.ZodType | undefined): Field[] {
  if (!schema) return [];
  const json = z.toJSONSchema(schema, { io: "input" }) as JsonSchema;
  return Object.entries(json.properties ?? {}).map(([name, prop]) => ({
    name,
    type: [prop.type ?? "object"].flat().join(" | "),
    required: json.required?.includes(name) ?? false,
    description: [
      prop.description,
      prop.default !== undefined && `Default ${JSON.stringify(prop.default)}.`,
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

function FieldTable({ title, fields }: { title: string; fields: Field[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {fields.map((field) => (
              <tr key={field.name} className="border-t align-top">
                <td className="py-1 pr-4 font-mono whitespace-nowrap">
                  {field.name}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </td>
                <td className="py-1 pr-4 text-muted-foreground">
                  {field.type}
                </td>
                <td className="py-1">{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <Card className="flex flex-col gap-3 p-4" id={endpoint.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="font-mono uppercase">{endpoint.method}</Badge>
        <code className="text-sm break-all">/api/v1{endpoint.path}</code>
        <Badge variant="outline" className="font-mono">
          {endpoint.scope ?? "any key"}
        </Badge>
      </div>
      <div>
        <p className="font-medium">{endpoint.summary}</p>
        {endpoint.description && (
          <p className="text-sm text-muted-foreground">
            {endpoint.description}
          </p>
        )}
      </div>
      <FieldTable title="Path parameters" fields={fieldsOf(endpoint.params)} />
      <FieldTable title="Query" fields={fieldsOf(endpoint.query)} />
      <FieldTable title="Body" fields={fieldsOf(endpoint.body)} />
      {endpoint.response ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Response {endpoint.status}
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(
              z.toJSONSchema(endpoint.response, { io: "output" }),
              null,
              2,
            )}
          </pre>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">
          Responds {endpoint.status} without content.
        </p>
      )}
    </Card>
  );
}

export default function ApiDocsPage() {
  const tags = [...new Set(publicApiEndpoints.map((e) => e.tag))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">API Reference</h1>
        <h4 className="text-muted-foreground">
          Send an API key as <code>Authorization: Bearer gcp_…</code>. The{" "}
          <Link href="/api/v1/openapi.json" className="underline">
            OpenAPI document
          </Link>{" "}
          works with Postman, Insomnia and client generators.
        </h4>
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-semibold">Scopes</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {API_KEY_SCOPES.map((scope) => (
            <li key={scope}>
              <code>{scope}</code>:{" "}
              <span className="text-muted-foreground">
                {API_KEY_SCOPE_DESCRIPTIONS[scope]}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {tags.map((tag) => (
        <section key={tag} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{tag}</h2>
          {publicApiEndpoints
            .filter((endpoint) => endpoint.tag === tag)
            .map((endpoint) => (
              <EndpointCard key={endpoint.id} endpoint={endpoint} />
            ))}
        </section>
      ))}
    </div>
  );
}
