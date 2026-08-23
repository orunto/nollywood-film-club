import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogPosterIdentity,
  contentOpenGraphObjectKey,
  isCatalogPosterUrl,
  mediaObjectKey,
  posterUrl,
} from "../../src/lib/media";

test("Open Graph images use a deterministic content key", () => {
  assert.equal(
    contentOpenGraphObjectKey("content-id"),
    "opengraph/content/content-id.jpg",
  );
});

test("catalog poster URLs only include media/nfc R2 objects", () => {
  assert.equal(isCatalogPosterUrl("/media/media/nfc/king_of_boys/v42.jpg"), true);
  assert.equal(isCatalogPosterUrl("nfc/legacy-cloudinary-id"), false);
  assert.equal(isCatalogPosterUrl("v42/nfc/legacy-cloudinary-id"), false);
  assert.equal(isCatalogPosterUrl("https://res.cloudinary.com/demo/poster.jpg"), false);
  assert.equal(isCatalogPosterUrl("/media/uploads/poster.jpg"), false);
  assert.equal(isCatalogPosterUrl(null), false);
});

test("poster URLs normalize R2 object keys from database and form values", () => {
  assert.equal(
    posterUrl("media/nfc/king_of_boys/v42.jpg"),
    "/media/media/nfc/king_of_boys/v42.jpg",
  );
  assert.equal(
    mediaObjectKey("/media/media/nfc/king_of_boys/v42.jpg"),
    "media/nfc/king_of_boys/v42.jpg",
  );
});

test("catalog poster uploads use the media/nfc catalog folder", () => {
  assert.deepEqual(catalogPosterIdentity("King of Boys 2018", "jpg", 42), {
    objectKey: "media/nfc/king_of_boys_2018/v42.jpg",
    publicId: "nfc/king_of_boys_2018",
    version: 42,
  });
});
