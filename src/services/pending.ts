import type {
  AuthService,
  ImageTransformer,
  MailService,
  MailMessage,
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

export class HttpImageTransformer implements ImageTransformer {
  constructor(private readonly endpoint: string, private readonly apiKey?: string) {}

  async transform(
    source: ReadableStream<Uint8Array>,
    options: {
      width: number;
      height: number;
      fit: "cover" | "contain";
      format: "jpeg" | "png" | "webp";
    },
  ) {
    const url = new URL(this.endpoint);
    url.searchParams.set("width", String(options.width));
    url.searchParams.set("height", String(options.height));
    url.searchParams.set("fit", options.fit);
    url.searchParams.set("format", options.format);

    const headers = new Headers({ "Content-Type": "application/octet-stream" });
    if (this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: source,
    });
    if (!response.ok) {
      throw new Error(`Image transformation failed with status ${response.status}`);
    }
    return response;
  }
}

// Test and migration fixtures can still construct an in-memory response
// transformer without configuring an external image service. Production
// runtimes do not use this adapter.
export class PassthroughImageTransformer implements ImageTransformer {
  async transform(source: ReadableStream<Uint8Array>) {
    return new Response(source);
  }
}

export class HttpMailService implements MailService {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage) {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      });
    } catch (error) {
      console.error("Mail delivery request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    if (!response.ok) {
      console.error("Mail delivery rejected", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Mail delivery failed with status ${response.status}`);
    }
  }
}

export function requireServiceConfig(
  name: string,
  value: string | undefined,
): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
