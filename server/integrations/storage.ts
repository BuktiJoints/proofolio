import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { env } from "@/server/env";

const e = env();
export const storage = new S3Client({ endpoint: e.S3_ENDPOINT, region: e.S3_REGION, forcePathStyle: e.S3_FORCE_PATH_STYLE, credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY } });
export async function ensureBucket() { try { await storage.send(new HeadBucketCommand({ Bucket: e.S3_BUCKET })); } catch { await storage.send(new CreateBucketCommand({ Bucket: e.S3_BUCKET })); } }
export async function putVideo(key: string, path: string, mime: string) { await storage.send(new PutObjectCommand({ Bucket: e.S3_BUCKET, Key: key, Body: createReadStream(path), ContentType: mime })); }
export async function deleteVideo(key: string) { await storage.send(new DeleteObjectCommand({ Bucket: e.S3_BUCKET, Key: key })); }
export async function getVideo(key: string, range?: string) { return storage.send(new GetObjectCommand({ Bucket: e.S3_BUCKET, Key: key, Range: range })); }
export async function storageReady() { await storage.send(new HeadBucketCommand({ Bucket: e.S3_BUCKET })); }
