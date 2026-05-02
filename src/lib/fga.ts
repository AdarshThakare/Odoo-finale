import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";
import { env } from "~/env";

// ---------------------------------------------------------------------------
// Client Initialization
// ---------------------------------------------------------------------------
// Supports two modes:
//   1. Local dev  → plain HTTP to localhost:8080 (no credentials)
//   2. Okta FGA   → OIDC client-credentials against fga.dev (Vercel / prod)
// ---------------------------------------------------------------------------

function buildClient(): OpenFgaClient {
  const baseOpts: Record<string, unknown> = {
    apiUrl: env.FGA_API_URL,
  };

  if (env.FGA_STORE_ID) baseOpts.storeId = env.FGA_STORE_ID;
  if (env.FGA_AUTHORIZATION_MODEL_ID)
    baseOpts.authorizationModelId = env.FGA_AUTHORIZATION_MODEL_ID;

  // If Okta FGA credentials are provided, use OIDC client-credentials flow
  if (env.FGA_CLIENT_ID && env.FGA_CLIENT_SECRET) {
    baseOpts.credentials = {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer: env.FGA_API_TOKEN_ISSUER ?? "fga.us.auth0.com",
        apiAudience: env.FGA_API_AUDIENCE ?? "https://api.us1.fga.dev/",
        clientId: env.FGA_CLIENT_ID,
        clientSecret: env.FGA_CLIENT_SECRET,
      },
    };
  }

  return new OpenFgaClient(baseOpts as ConstructorParameters<typeof OpenFgaClient>[0]);
}

export const fgaClient = buildClient();

// ---------------------------------------------------------------------------
// Helper: Single authorization check
// ---------------------------------------------------------------------------
export async function checkAccess(
  userId: string,
  relation: string,
  objectType: string,
  objectId: string,
): Promise<boolean> {
  try {
    const { allowed } = await fgaClient.check({
      user: `user:${userId}`,
      relation,
      object: `${objectType}:${objectId}`,
    });
    return allowed ?? false;
  } catch (err) {
    console.error("[FGA] check failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: Batch authorization checks (server-side batch, SDK ≥ 0.9)
// ---------------------------------------------------------------------------
export interface FgaCheckItem {
  userId: string;
  relation: string;
  objectType: string;
  objectId: string;
}

export async function batchCheckAccess(
  checks: FgaCheckItem[],
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  if (checks.length === 0) return results;

  try {
    const response = await fgaClient.batchCheck({
      checks: checks.map((c, idx) => ({
        user: `user:${c.userId}`,
        relation: c.relation,
        object: `${c.objectType}:${c.objectId}`,
        correlationId: String(idx),
      })),
    });

    for (const [correlationId, result] of Object.entries(
      response.result ?? {},
    )) {
      const idx = Number(correlationId);
      const check = checks[idx];
      if (check) {
        const key = `${check.objectType}:${check.objectId}#${check.relation}`;
        results.set(
          key,
          (result as { allowed?: boolean }).allowed ?? false,
        );
      }
    }
  } catch (err) {
    console.error("[FGA] batchCheck failed:", err);
    // All checks default to false on failure
    for (const c of checks) {
      const key = `${c.objectType}:${c.objectId}#${c.relation}`;
      results.set(key, false);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helper: Write a single relationship tuple
// ---------------------------------------------------------------------------
export async function writeTuple(
  user: string,
  relation: string,
  object: string,
): Promise<void> {
  try {
    await fgaClient.write({
      writes: [{ user, relation, object }],
    });
    console.log(`[FGA] wrote tuple: (${user}, ${relation}, ${object})`);
  } catch (err: unknown) {
    // Duplicate tuple writes are idempotent – ignore 422 errors
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("cannot write a tuple which already exists")) {
      console.log(`[FGA] tuple already exists: (${user}, ${relation}, ${object})`);
      return;
    }
    console.error("[FGA] writeTuple failed:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helper: Delete a single relationship tuple
// ---------------------------------------------------------------------------
export async function deleteTuple(
  user: string,
  relation: string,
  object: string,
): Promise<void> {
  try {
    await fgaClient.write({
      deletes: [{ user, relation, object }],
    });
    console.log(`[FGA] deleted tuple: (${user}, ${relation}, ${object})`);
  } catch (err) {
    console.error("[FGA] deleteTuple failed:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helper: Write a batch of tuples (chunks of 50 for FGA limits)
// ---------------------------------------------------------------------------
export async function writeTuples(
  tuples: { user: string; relation: string; object: string }[],
): Promise<void> {
  const CHUNK_SIZE = 40; // safe under FGA's 50-tuple limit
  for (let i = 0; i < tuples.length; i += CHUNK_SIZE) {
    const chunk = tuples.slice(i, i + CHUNK_SIZE);
    try {
      await fgaClient.write({ writes: chunk });
      console.log(
        `[FGA] wrote batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} tuples)`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("cannot write a tuple which already exists")) {
        console.log(`[FGA] batch ${Math.floor(i / CHUNK_SIZE) + 1} – some tuples already exist, continuing`);
        // Fall back to individual writes for this chunk
        for (const tuple of chunk) {
          await writeTuple(tuple.user, tuple.relation, tuple.object);
        }
      } else {
        console.error(`[FGA] batch write failed:`, err);
        throw err;
      }
    }
  }
}
