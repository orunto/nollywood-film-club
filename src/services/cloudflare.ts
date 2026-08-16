import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { CatalogWriteRepository } from "../repositories/catalog-write";
import { CommunityWriteRepository } from "../repositories/community-write";
import { PublicReadRepository } from "../repositories/public-read";
import type {
  AppServices,
  AtomicCommand,
  AtomicResult,
  Database,
  ImageTransformer,
  ObjectStore,
} from "./contracts";
import {
  PendingAuthService,
  PendingMailService,
} from "./pending";

class D1Database implements Database {
  readonly publicReads: PublicReadRepository;
  readonly writes: CommunityWriteRepository;
  readonly catalog: CatalogWriteRepository;

  constructor(private readonly binding: globalThis.D1Database) {
    this.publicReads = new PublicReadRepository(
      drizzle(this.binding, { schema }),
    );
    this.writes = new CommunityWriteRepository(this);
    this.catalog = new CatalogWriteRepository(this);
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
  return {
    runtime: "cloudflare",
    db: new D1Database(env.DB),
    auth: new PendingAuthService(),
    objects: new R2ObjectStore(env.OBJECTS),
    images: new CloudflareImageTransformer(env.IMAGES),
    mail: new PendingMailService(),
  };
}
