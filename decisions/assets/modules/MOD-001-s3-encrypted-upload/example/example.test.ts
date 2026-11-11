import test from "node:test";
import assert from "node:assert/strict";
import { shouldPutBytes, createMockObjectStorage } from "./portable-slice.mjs";

test("MOD-001: 协议判定 — http(s) presigned URL 才真字节 PUT", () => {
  assert.equal(shouldPutBytes("https://bucket.s3.amazonaws.com/abc?sig=x"), true);
  assert.equal(shouldPutBytes("http://localhost:9000/creatoros/abc"), true);
  assert.equal(shouldPutBytes("mock://mock-1"), false);
});

test("MOD-001: mock ObjectStoragePort presign→complete→head 往返自洽", async () => {
  const storage = createMockObjectStorage({ nextKey: () => "it-1" });
  const { storageKey, uploadUrl } = await storage.createPresignedUpload({
    mimeType: "text/plain",
    fileSize: 11,
  });
  assert.equal(storageKey, "it-1");
  assert.equal(shouldPutBytes(uploadUrl), false); // mock:// 不真 PUT
  await storage.completeUpload(storageKey, "hello-bytes");
  const head = await storage.headObject(storageKey);
  assert.equal(head.mimeType, "text/plain");
  assert.equal(head.fileSize, 11);
});
