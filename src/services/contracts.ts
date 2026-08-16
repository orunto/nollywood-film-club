import type { CommunityWriteRepository } from "../repositories/community-write";
import type { PublicReadRepository } from "../repositories/public-read";

export interface AuthSession {
  userId: string;
}

export type AtomicValue = string | number | bigint | null;

export interface AtomicCommand {
  sql: string;
  params?: AtomicValue[];
}

export interface AtomicResult {
  changes: number;
  lastRowId: number;
}

export interface Database {
  check(): Promise<void>;
  publicReads: PublicReadRepository;
  writes: CommunityWriteRepository;
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export interface AuthService {
  getSession(request: Request): Promise<AuthSession | null>;
}

export interface ObjectStore {
  check(): Promise<void>;
}

export interface ImageTransformer {
  transform(
    source: ReadableStream<Uint8Array>,
    options: {
      width: number;
      height: number;
      fit: "cover" | "contain";
      format: "jpeg" | "png" | "webp";
    },
  ): Promise<Response>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailService {
  send(message: MailMessage): Promise<void>;
}

export interface AppServices {
  runtime: "cloudflare" | "node";
  db: Database;
  auth: AuthService;
  objects: ObjectStore;
  images: ImageTransformer;
  mail: MailService;
}
