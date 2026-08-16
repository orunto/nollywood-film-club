import type {
  AppServices,
  Database,
  ImageTransformer,
  ObjectStore,
} from "./contracts";
import {
  PendingAuthService,
  PendingMailService,
} from "./pending";

class D1Database implements Database {
  constructor(private readonly binding: globalThis.D1Database) {}

  async check() {
    await this.binding.prepare("SELECT 1 AS ok").first();
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
