import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { createBetterAuthService } from "../auth/server";
import { CatalogWriteRepository } from "../repositories/catalog-write";
import { CommunityWriteRepository } from "../repositories/community-write";
import { PublicReadRepository } from "../repositories/public-read";
import { UserProfileRepository } from "../repositories/user-profile";
import type {
  AppServices,
  AtomicCommand,
  AtomicResult,
  Database,
  ImageTransformer,
  ObjectStore,
} from "./contracts";
import { PendingMailService } from "./pending";

class D1Database implements Database {
  readonly publicReads: PublicReadRepository;
  readonly writes: CommunityWriteRepository;
  readonly catalog: CatalogWriteRepository;
  readonly profiles: UserProfileRepository;

  constructor(
    private readonly binding: globalThis.D1Database,
    instance: DrizzleD1Database<typeof schema>,
  ) {
    this.publicReads = new PublicReadRepository(instance);
    this.writes = new CommunityWriteRepository(this);
    this.catalog = new CatalogWriteRepository(this);
    this.profiles = new UserProfileRepository(this);
  }

  async check() {
    await this.binding.prepare("SELECT 1 AS ok").first();
  }

  async atomic(commands: AtomicCommand[]): Promise<AtomicResult[]> {
    const results = await this.binding.batch(
      commands.map(({ sql, params = [] }) =>
        this.binding.prepare(sql).bind(...params),
      ),
    );

    const failed = results.find(
      (result) => (result as { success?: boolean }).success === false,
    );
    if (failed) {
      throw new Error(
        (failed as { error?: string }).error ?? "Atomic statement failed",
      );
    }

    return results.map((result) => ({
      changes: result.meta.changes,
      lastRowId: result.meta.last_row_id,
    }));
  }
}

class R2ObjectStore implements ObjectStore {
  constructor(private readonly binding: R2Bucket) {}

  async check() {
    await this.binding.head("__nfc_healthcheck__");
  }
}

class CloudflareImageTransformer implements ImageTransformer {
  constructor(private readonly binding: ImagesBinding) {}

  async transform(
    source: ReadableStream<Uint8Array>,
    options: {
      width: number;
      height: number;
      fit: "cover" | "contain";
      format: "jpeg" | "png" | "webp";
    },
  ) {
    const result = await this.binding
      .input(source)
      .transform({
        width: options.width,
        height: options.height,
        fit: options.fit,
      })
      .output({ format: `image/${options.format}` });

    return result.response();
  }
}

export function createCloudflareServices(env: Env): AppServices {
  const instance = drizzle(env.DB, { schema });
  const authEnv = env as AuthEnv;
  const mail = new PendingMailService();
  return {
    runtime: "cloudflare",
    db: new D1Database(env.DB, instance),
    auth: createBetterAuthService(instance, {
      baseURL: authEnv.AUTH_URL ?? "http://localhost:8787",
      secret: authEnv.AUTH_SECRET ?? "dev-secret-change-me",
      mail,
      google:
        authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET
          ? {
              clientId: authEnv.GOOGLE_CLIENT_ID,
              clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
            }
          : undefined,
      twitter:
        authEnv.X_CLIENT_ID && authEnv.X_CLIENT_SECRET
          ? {
              clientId: authEnv.X_CLIENT_ID,
              clientSecret: authEnv.X_CLIENT_SECRET,
            }
          : undefined,
    }),
    objects: new R2ObjectStore(env.OBJECTS),
    images: new CloudflareImageTransformer(env.IMAGES),
    mail,
  };
}

// Wrangler types vars as their literal placeholder values; auth secrets are
// set per environment via `wrangler secret put`, so widen to the real shape.
interface AuthEnv {
  AUTH_URL?: string;
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
}
