// MOD-001 portable slice — 从 files/s3-object-storage.ts 抽出的零依赖纯逻辑,
// 供 in-skill example 跑绿(真 @aws-sdk 路径见 files/,本切片只证明协议判定 + Port 抽象自洽)。

// 前端上传协议判定:真 presigned URL 才 PUT 字节,mock:// 跳过(ENTRY 坑#1)。
export function shouldPutBytes(uploadUrl) {
  return /^https?:\/\//.test(uploadUrl);
}

// 最小 in-memory ObjectStoragePort(mock 实现的语义内核)。
export function createMockObjectStorage({ nextKey } = {}) {
  let seq = 0;
  const store = new Map(); // storageKey -> { mimeType, fileSize, body }
  const key = nextKey ?? (() => `mock-${++seq}`);
  return {
    async createPresignedUpload({ mimeType, fileSize }) {
      const storageKey = key();
      store.set(storageKey, { mimeType, fileSize, body: null });
      return { storageKey, uploadUrl: `mock://${storageKey}` };
    },
    async completeUpload(storageKey, body) {
      const e = store.get(storageKey);
      if (!e) throw new Error(`unknown storageKey ${storageKey}`);
      e.body = body;
    },
    async headObject(storageKey) {
      const e = store.get(storageKey);
      if (!e) throw new Error(`unknown storageKey ${storageKey}`);
      return { mimeType: e.mimeType, fileSize: e.fileSize };
    },
  };
}
