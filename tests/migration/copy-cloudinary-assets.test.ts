import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  copyManifest,
  type CopyManifestOptions,
} from "../../tools/migration/copy-cloudinary-assets";
import type { CloudinaryManifest } from "../../tools/migration/inventory-cloudinary";

const fixturePath = resolve("tests/migration/fixtures/cloudinary-copy-manifest.json");

async function fixture(): Promise<CloudinaryManifest> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as CloudinaryManifest;
}

async function withStore(run: (options: CopyManifestOptions) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "nfc-cloudinary-copy-"));
  try {
    await run({
      manifestPath: join(directory, "manifest.json"),
      objectRoot: join(directory, "objects"),
      maxBytes: 100,
      timeoutMilliseconds: 1_000,
      fetchImplementation: async (input) => {
        if (String(input).endsWith("poster.jpg")) {
          return new Response(new Uint8Array([1, 2, 3, 4]), {
            status: 200,
            headers: { "content-length": "4" },
          });
        }
        return new Response(new Uint8Array([9, 8, 7]), { status: 200 });
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("copies fixture assets, writes checksum/object, and checkpoints each asset", async () => {
  const manifest = await fixture();
  await withStore(async (options) => {
    const failed = await copyManifest(manifest, options);
    assert.equal(failed.length, 1);
    assert.equal(manifest.assets[0]?.status, "copied");
    assert.equal(
      manifest.assets[0]?.copiedChecksum,
      "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
    );
    assert.deepEqual(
      [...(await readFile(join(options.objectRoot, "media/nfc/poster/v42.jpg")))],
      [1, 2, 3, 4],
    );
    const checkpoint = JSON.parse(await readFile(options.manifestPath, "utf8")) as CloudinaryManifest;
    assert.equal(checkpoint.assets[0]?.status, "copied");
    assert.equal(checkpoint.assets[1]?.status, "failed");
  });
});

test("records size mismatches as failed without writing an object", async () => {
  const manifest = await fixture();
  manifest.assets = [manifest.assets[1]!];
  await withStore(async (options) => {
    const failed = await copyManifest(manifest, options);
    assert.equal(failed.length, 1);
    assert.equal(manifest.assets[0]?.status, "failed");
    assert.equal(manifest.assets[0]?.copyError, "Byte length mismatch: expected 5, got 3");
    await assert.rejects(readFile(join(options.objectRoot, "media/nfc/banner/v7.png")));
  });
});

test("records failed HTTP status and resumes from the checkpoint", async () => {
  const manifest = await fixture();
  manifest.assets = [manifest.assets[0]!];
  await withStore(async (options) => {
    options.fetchImplementation = async () => new Response(null, { status: 503 });
    assert.equal((await copyManifest(manifest, options)).length, 1);
    assert.equal(manifest.assets[0]?.copyError, "Source returned HTTP 503");

    options.fetchImplementation = async () =>
      new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    assert.equal((await copyManifest(manifest, options)).length, 0);
    assert.equal(manifest.assets[0]?.status, "copied");
    assert.equal(manifest.assets[0]?.copyError, null);
  });
});
