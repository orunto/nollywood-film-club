import type {
  AuthService,
  ImageTransformer,
  MailService,
} from "./contracts";

export class PendingAuthService implements AuthService {
  async handler(_request: Request) {
    void _request;
    return new Response("Authentication has not been configured", {
      status: 501,
    });
  }

  async getSession(_request: Request) {
    void _request;
    return null;
  }
}

export class PassthroughImageTransformer implements ImageTransformer {
  async transform(source: ReadableStream<Uint8Array>) {
    return new Response(source);
  }
}

export class PendingMailService implements MailService {
  async send() {
    throw new Error("Mail service has not been configured");
  }
}
