import "server-only";
import vision, { type ImageAnnotatorClient } from "@google-cloud/vision";

/**
 * Google Cloud Vision client. Replaces the old `@google-cloud/vision` v1 setup in
 * index.js that read a `google1.json` key file from disk. Credentials now come
 * from a base64-encoded service-account JSON in `GOOGLE_CLOUD_CREDENTIALS`.
 */
let client: ImageAnnotatorClient | null = null;

export function getVisionClient(): ImageAnnotatorClient {
  if (client) return client;

  const raw = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (!raw) {
    throw new Error("Missing GOOGLE_CLOUD_CREDENTIALS environment variable.");
  }

  const creds = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  client = new vision.ImageAnnotatorClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || creds.project_id,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
  });

  return client;
}
