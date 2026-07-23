/**
 * Example Transcend custom function.
 *
 * Custom functions run on your Sombra gateway in a sandboxed Deno runtime.
 * Network access is limited to the `allowed-hosts` from the manifest, and
 * environment variables from the manifest's `env` block are available via
 * `Deno.env`.
 *
 * @param payload - The input payload provided by the triggering workflow
 * @returns The function result
 */
export default async function scoreLead({
  environment,
  payload,
  sdk,
}: {
  environment: { [key: string]: string };
  payload: { email: string };
  sdk: any;
}): Promise<{ score: number }> {
  const apiKey = environment['CRM_API_KEY'];
  const response = await fetch(
    `https://api.example.com/leads?email=${encodeURIComponent(payload.email)}`,
    { headers: { authorization: `Bearer ${apiKey}` } },
  );
  const lead = await response.json();
  return { score: lead.score ?? 0 };
}
