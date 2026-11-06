import { scalarBundle } from "@/lib/public-api/scalar-bundle";

export async function GET(request: Request) {
  const bundle = await scalarBundle();
  const accepted = request.headers.get("accept-encoding") ?? "";
  const [body, encoding] = /\bbr\b/.test(accepted)
    ? [bundle.brotli, "br"]
    : /\bgzip\b/.test(accepted)
      ? [bundle.gzip, "gzip"]
      : [bundle.source, undefined];

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // The docs page links it with the package version, so a new version gets a new URL
      "Cache-Control": "public, max-age=31536000, immutable",
      Vary: "Accept-Encoding",
      ...(encoding && { "Content-Encoding": encoding }),
    },
  });
}
