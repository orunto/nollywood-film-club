import { access, readFile } from "node:fs/promises";
import { writeJsonAtomic } from "./io";

export async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    await access(path);
  } catch {
    return null;
  }
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export { writeJsonAtomic };
