import type { CatalogWriteRepository } from "../repositories/catalog-write";
import type { CommunityWriteRepository } from "../repositories/community-write";
import type { ContactMessageRepository } from "../repositories/contact-message";
import type { AdminUsersRepository } from "../repositories/admin-users";
import type { PublicReadRepository } from "../repositories/public-read";
import type { UserProfileRepository } from "../repositories/user-profile";

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  username: string | null;
  role: "user" | "admin";
  regular: boolean;
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
  catalog: CatalogWriteRepository;
  profiles: UserProfileRepository;
  contacts: ContactMessageRepository;
  adminUsers: AdminUsersRepository;
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export interface AuthService {
  handler(request: Request): Promise<Response>;
  getSession(request: Request): Promise<AuthSession | null>;
}

export interface ObjectStore {
  check(): Promise<void>;
  get(key: string): Promise<ObjectValue | null>;
  put(
    key: string,
    value: string | Blob | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array> | null,
    options?: ObjectPutOptions,
  ): Promise<void>;
}

export interface ObjectValue {
  body: ReadableStream<Uint8Array>;
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
}

export interface ObjectPutOptions {
  contentType?: string;
  contentLength?: number;
  cacheControl?: string;
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
