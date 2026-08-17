# Operations Runbook

## Secrets

Set runtime secrets per environment, never in `wrangler.jsonc` or committed
`.env` files:

```text
wrangler secret put AUTH_SECRET --env production
wrangler secret put MAIL_API_KEY --env production
wrangler secret put MAIL_API_URL --env production
wrangler secret put MAIL_FROM --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put X_CLIENT_SECRET --env production
```

Use a new random `AUTH_SECRET` at cutover. Keep source Neon, Hexclave, and
Cloudinary credentials available only to migration jobs.

## Restore rehearsal

```text
wrangler d1 export nollywood-film-club-production --remote --output data/migration/d1-export.sql
npm run migration:restore-sqlite -- data/migration/d1-export.sql data/restore/production.sqlite
npm run migration:validate-sqlite -- data/restore/production.sqlite
npm run migration:copy-objects -- data/objects data/objects-restore
```

For S3-compatible storage set `S3_ENDPOINT`, `S3_BUCKET`, and AWS credentials;
the object command uses `aws s3 sync` and keeps immutable media keys unchanged.

## Cutover and rollback

1. Lower DNS TTL and freeze legacy writes.
2. Export final D1, identity, and media manifests.
3. Run row, aggregate, checksum, and auth smoke validations.
4. Deploy the Worker and update OAuth callback URLs.
5. Monitor authentication, writes, object misses, and error rate.
6. Roll back DNS to the frozen legacy deployment if validation fails; export
   accepted new writes before attempting another forward cutover.

Keep the legacy systems read-only until the rollback window closes.
