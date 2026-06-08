export type IndustrialManifestTcnFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type IndustrialManifest = {
  schemaVersion: 1;
  generatedAt: string;
  protectedFiles: IndustrialManifestTcnFile[];
};

async function sha256Hex(content: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("SHA-256 indisponível neste ambiente.");
  }
  const data = new TextEncoder().encode(content);
  const digest = await cryptoApi.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildIndustrialManifest(
  files: Array<{ path: string; content: string }>
): Promise<IndustrialManifest> {
  const protectedFiles = await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      sha256: await sha256Hex(file.content),
      bytes: new TextEncoder().encode(file.content).byteLength,
    }))
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    protectedFiles,
  };
}
