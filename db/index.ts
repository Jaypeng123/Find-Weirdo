import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type CloudflareRuntimeEnv = {
  DB?: D1Database;
};

async function getCloudflareRuntimeEnv(): Promise<CloudflareRuntimeEnv> {
  try {
    const workersSpecifier = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ workersSpecifier)) as {
      env?: CloudflareRuntimeEnv;
    };
    return mod.env ?? {};
  } catch {
    return {};
  }
}

export async function getDb() {
  const env = await getCloudflareRuntimeEnv();

  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
