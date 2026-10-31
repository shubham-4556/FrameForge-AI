export function createStorageDriver(env: any) {
  return {
    async putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string) {
      // local storage stub
      return { key };
    },
    async getObject(key: string) {
      return Buffer.from([]);
    },
    async getSignedUploadUrl(key: string, contentType?: string, expiresInSeconds = 900) {
      return `http://localhost:4000/api/files/upload?key=${encodeURIComponent(key)}`;
    },
    async getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
      return `http://localhost:4000/api/files?key=${encodeURIComponent(key)}`;
    },
    async deleteObject(key: string) {
      return;
    },
  };
}
