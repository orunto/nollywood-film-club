import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  destinationKey,
  normalizeResource,
} from "../../tools/migration/inventory-cloudinary";

describe("Cloudinary inventory", () => {
  it("creates immutable provider-neutral destination keys", () => {
    assert.equal(
      destinationKey({ public_id: "nfc/poster", version: 42, format: "jpg" }),
      "media/nfc/poster/v42.jpg",
    );
  });

  it("normalizes source metadata for later copy validation", () => {
    const asset = normalizeResource({
      public_id: "nfc/poster",
      asset_folder: "nfc",
      version: 42,
      format: "jpg",
      resource_type: "image",
      type: "upload",
      width: 800,
      height: 450,
      bytes: 1234,
      asset_id: "asset-1",
      secure_url: "https://res.cloudinary.com/example/image/upload/v42/nfc/poster.jpg",
    });

    assert.deepEqual(asset, {
      publicId: "nfc/poster",
      assetFolder: "nfc",
      version: 42,
      format: "jpg",
      mimeType: "image/jpeg",
      resourceType: "image",
      deliveryType: "upload",
      width: 800,
      height: 450,
      bytes: 1234,
      assetId: "asset-1",
      etag: null,
      createdAt: null,
      sourceUrl: "https://res.cloudinary.com/example/image/upload/v42/nfc/poster.jpg",
      destinationKey: "media/nfc/poster/v42.jpg",
      status: "pending",
      copiedAt: null,
      copiedChecksum: null,
      copyError: null,
    });
  });
});
