import crypto from "crypto";
import { NextResponse } from "next/server";

import { env } from "~/env";

export const runtime = "nodejs";

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_FOLDER = "empay/company-logos";

type CloudinaryUploadResponse =
  | { secure_url: string }
  | { error: { message?: string } };

function isCloudinaryUploadResponse(
  value: unknown,
): value is CloudinaryUploadResponse {
  if (!value || typeof value !== "object") return false;
  if ("secure_url" in value && typeof value.secure_url === "string") {
    return true;
  }
  if ("error" in value && typeof value.error === "object") {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  if (
    !env.CLOUDINARY_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not configured" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Logo file is required" },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are supported" },
      { status: 400 },
    );
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json(
      { error: "Logo must be under 1MB" },
      { status: 400 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(
      `folder=${LOGO_FOLDER}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`,
    )
    .digest("hex");

  const uploadForm = new FormData();
  uploadForm.set("file", file);
  uploadForm.set("api_key", env.CLOUDINARY_API_KEY);
  uploadForm.set("timestamp", String(timestamp));
  uploadForm.set("signature", signature);
  uploadForm.set("folder", LOGO_FOLDER);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_NAME}/image/upload`,
    {
      method: "POST",
      body: uploadForm,
    },
  );

  const payload: unknown = await uploadResponse.json().catch(() => null);

  if (!uploadResponse.ok) {
    const message =
      isCloudinaryUploadResponse(payload) && "error" in payload
        ? (payload.error.message ?? "Cloudinary upload failed")
        : "Cloudinary upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!isCloudinaryUploadResponse(payload) || !("secure_url" in payload)) {
    return NextResponse.json(
      { error: "Cloudinary upload failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: payload.secure_url });
}
