import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { FileSystemObjectStore } from "../../src/services/node";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("FileSystemObjectStore", () => {
  it("writes and streams objects with inferred image metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "nfc-objects-"));
    temporaryDirectories.push(root);
    const store = new FileSystemObjectStore(root);

    await store.put("media/poster.jpg", new Uint8Array([1, 2, 3]));
    const object = await store.get("media/poster.jpg");

    assert.ok(object);
    assert.equal(object.contentType, "image/jpeg");
    assert.equal(object.contentLength, 3);
    assert.deepEqual(
      Array.from(new Uint8Array(await new Response(object.body).arrayBuffer())),
      [1, 2, 3],
    );
  });

  it("rejects traversal keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "nfc-objects-"));
    temporaryDirectories.push(root);
    const store = new FileSystemObjectStore(root);

    await assert.rejects(store.put("../outside.txt", "unsafe"), /Invalid object key/);
    await assert.rejects(store.get("nested\\outside.txt"), /Invalid object key/);
  });
});
