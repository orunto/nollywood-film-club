import assert from "node:assert/strict";
import test from "node:test";
import { fetchJustWatchImage, sniffImage, validateJustWatchImageUrl, MAX_REMOTE_IMAGE_BYTES } from "../../src/services/remote-image";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const response = (bytes: Uint8Array, headers = { "content-type": "image/png" }) => new Response(bytes, { headers });

test("only permits HTTPS JustWatch image hosts", () => {
  assert.equal(validateJustWatchImageUrl("https://images.justwatch.com/a.jpg").hostname, "images.justwatch.com");
  assert.throws(() => validateJustWatchImageUrl("http://images.justwatch.com/a.jpg"));
  assert.throws(() => validateJustWatchImageUrl("https://127.0.0.1/a.jpg"));
  assert.throws(() => validateJustWatchImageUrl("https://images.justwatch.com@127.0.0.1/a.jpg"));
});

test("rejects redirects to another host and invalid image bytes", async () => {
  await assert.rejects(fetchJustWatchImage("https://images.justwatch.com/a.jpg", async () => new Response(null, { status: 302, headers: { location: "https://example.com/a.jpg" } })));
  assert.throws(() => sniffImage(new Uint8Array([1, 2, 3]), "image/png"));
});

test("follows safe redirects and enforces the sniffed type", async () => {
  let calls = 0;
  const image = await fetchJustWatchImage("https://images.justwatch.com/a.jpg", async (url) => {
    calls++;
    return calls === 1 ? new Response(null, { status: 302, headers: { location: new URL("b.jpg", url).toString() } }) : response(png);
  });
  assert.equal(calls, 2);
  assert.equal(image.mimeType, "image/png");
  assert.deepEqual(Array.from(image.bytes), Array.from(png));
});

test("enforces the response size limit without trusting content-length", async () => {
  await assert.rejects(
    fetchJustWatchImage("https://images.justwatch.com/a.jpg", async () =>
      response(new Uint8Array(MAX_REMOTE_IMAGE_BYTES + 1), { "content-type": "image/png" }),
    ),
    /size limit/,
  );
});
