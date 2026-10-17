"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type StagedImage = { token: string; previewUrl: string };

const defaultMaxImageSize = 10 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedImageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
let configuredImageSizeRequest: Promise<number> | null = null;

async function responseError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

function loadConfiguredImageSize() {
  if (!configuredImageSizeRequest) {
    configuredImageSizeRequest = fetch("/api/admin/portfolio/uploads", {
      credentials: "same-origin",
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const size = Number(response.headers.get("X-Max-Gallery-Image-Size-Bytes"));
      if (!Number.isSafeInteger(size) || size < 1) throw new Error("The configured image upload limit is invalid.");
      return size;
    }).catch((cause: unknown) => {
      configuredImageSizeRequest = null;
      throw cause;
    });
  }
  return configuredImageSizeRequest;
}

export function AdminGalleryImageField({
  prefix,
  label,
  currentImageRef,
  initialImageRef = "",
  imageFieldName = "imageRef",
  currentImageAlt = "Current image",
  chooseImageLabel = `Choose ${label.toLowerCase()}`,
  maxImageSize,
  disabled = false,
}: {
  prefix: string;
  label: string;
  currentImageRef: string;
  initialImageRef?: string;
  imageFieldName?: string;
  currentImageAlt?: string;
  chooseImageLabel?: string;
  maxImageSize?: number;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const lastSavedImageRef = useRef(initialImageRef);
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [configuredMaxImageSize, setConfiguredMaxImageSize] = useState<number | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(maxImageSize === undefined);
  const [limitError, setLimitError] = useState("");
  const effectiveMaxImageSize = maxImageSize ?? configuredMaxImageSize ?? defaultMaxImageSize;

  useEffect(() => {
    if (maxImageSize !== undefined) return;
    let active = true;
    loadConfiguredImageSize().then((size) => {
      if (active) setConfiguredMaxImageSize(size);
    }).catch((cause: unknown) => {
      if (active) setLimitError(cause instanceof Error ? cause.message : "The image upload limit could not be loaded.");
    }).finally(() => {
      if (active) setLoadingLimit(false);
    });
    return () => { active = false; };
  }, [maxImageSize]);

  useEffect(() => {
    if (initialImageRef !== lastSavedImageRef.current) {
      lastSavedImageRef.current = initialImageRef;
      setStagedImage(null);
      setError("");
    }
  }, [initialImageRef]);

  async function discardStagedImage(token: string) {
    const response = await fetch(`/api/admin/portfolio/uploads/${token}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok && response.status !== 404) throw new Error(await responseError(response));
  }

  async function upload(file: File) {
    setError("");
    if (file.size === 0) {
      setError("Choose a non-empty image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (loadingLimit) {
      setError("Wait for the image upload limit to load.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (file.size > effectiveMaxImageSize) {
      setError(`Choose an image no larger than ${formatSize(effectiveMaxImageSize)}.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!supportedImageTypes.has(file.type) && !supportedImageExtensions.has(extension)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const response = await fetch("/api/admin/portfolio/uploads", {
        method: "POST",
        credentials: "same-origin",
        body: payload,
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      if (typeof data.token !== "string" || typeof data.previewUrl !== "string") {
        throw new Error("The uploaded image response was invalid.");
      }
      if (stagedImage) await discardStagedImage(stagedImage.token);
      setStagedImage({ token: data.token, previewUrl: data.previewUrl });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function cancelUpload() {
    if (!stagedImage) return;
    setCanceling(true);
    setError("");
    try {
      await discardStagedImage(stagedImage.token);
      setStagedImage(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The pending image could not be removed.");
    } finally {
      setCanceling(false);
    }
  }

  const prefixId = prefix.replace(/[^a-zA-Z0-9_-]/g, "-");
  return <>
    <input type="hidden" name="initialImageRef" value={initialImageRef} />
    <input type="hidden" name={imageFieldName} value={currentImageRef} />
    {stagedImage ? <input type="hidden" name="imageUploadToken" value={stagedImage.token} /> : null}
    <div className="admin-field admin-gallery-upload-field">
      <label htmlFor={`${prefixId}-upload`}>{label}</label>
      <div className="admin-gallery-upload-controls">
        <button className="button button-light" type="button" disabled={disabled || uploading || canceling || loadingLimit || Boolean(limitError)} onClick={() => fileInput.current?.click()}>
          {uploading ? "Uploading…" : label}
        </button>
        <input
          ref={fileInput}
          className="admin-gallery-file-input"
          id={`${prefixId}-upload`}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-label={chooseImageLabel}
          disabled={disabled || uploading || canceling || loadingLimit || Boolean(limitError)}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void upload(file);
          }}
        />
        {stagedImage ? <button className="button button-light" type="button" disabled={disabled || uploading || canceling} onClick={() => void cancelUpload()}>
          {canceling ? "Canceling…" : "Cancel replacement"}
        </button> : null}
      </div>
      <span className="admin-field-hint">JPEG, PNG, or WebP · maximum {formatSize(effectiveMaxImageSize)}</span>
      {loadingLimit ? <span role="status" className="admin-upload-status">Loading image upload limit…</span> : null}
      {uploading ? <><span role="status" className="admin-upload-status">Uploading and validating image…</span><progress aria-label="Image upload progress" /></> : null}
      {stagedImage ? <span role="status" className="admin-upload-status">Image uploaded and ready to save.</span> : null}
      {error || limitError ? <span role="alert" className="admin-upload-error">{error || limitError}</span> : null}
      <div className="admin-gallery-image-previews">
        {currentImageRef ? <figure><Image src={currentImageRef} alt={currentImageAlt} width={560} height={350} unoptimized /><figcaption>Saved image</figcaption></figure> : null}
        {stagedImage ? <figure><Image src={stagedImage.previewUrl} alt="Preview of selected replacement" width={560} height={350} unoptimized /><figcaption>Pending replacement</figcaption></figure> : null}
      </div>
    </div>
  </>;
}

function formatSize(size: number) {
  return size % (1024 * 1024) === 0 ? `${size / (1024 * 1024)} MB` : `${Math.round(size / 1024)} KB`;
}
