import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const [source = "data/objects", destination = "data/objects-restore"] = process.argv.slice(2);
const endpoint = process.env.S3_ENDPOINT;
if (!endpoint) {
  await mkdir(resolve(destination), { recursive: true });
  await cp(resolve(source), resolve(destination), { recursive: true, force: false, errorOnExist: false });
  console.log(JSON.stringify({ copied: true, mode: "filesystem", source: resolve(source), destination: resolve(destination) }));
} else {
  const args = ["s3", "sync", resolve(source), `s3://${process.env.S3_BUCKET ?? "nollywood-film-club-media"}`, "--endpoint-url", endpoint, "--no-follow-symlinks"];
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(process.env.AWS_BIN ?? "aws", args, { stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`aws s3 sync exited with ${code}`)));
  });
  console.log(JSON.stringify({ copied: true, mode: "s3", endpoint, bucket: process.env.S3_BUCKET }));
}
