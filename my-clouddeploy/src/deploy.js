import {
  //   paginateListBuckets,
  S3Client,
  S3ServiceException,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import process from "process";
import dotenv from "dotenv";
dotenv.config();

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

const BUCKET_NAME = "cloud-deploy-bucket-01";

export const uploadFile = async (filePath, keyName) => {
  const client = new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const fileContent = fs.readFileSync(filePath);

    // Dynamically set the file's MIME type based on file extension (e.g., text/html for .txt)
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream"; // Add more MIME types if needed

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: keyName,
      Body: fileContent,
      ContentType: contentType, // change based on file type
      ACL: "public-read", // makes file publicly accessible
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await client.send(command);
    console.log("File uploaded successfully: ", response);
  } catch (err) {
    if (err instanceof S3ServiceException) {
      console.error(`${err.name}: ${err.message}`);
    } else {
      throw err;
    }
  }
};

const uploadDir = async (dirPath, basePath = dirPath) => {
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);

    if (fs.lstatSync(entryPath).isDirectory()) {
      await uploadDir(entryPath, basePath); // recurse
    } else {
      const relativePath = path.relative(basePath, entryPath);
      await uploadFile(entryPath, relativePath);
    }
  }
};

const targetDir = "public";
// path.join(process.cwd(), "dist"); // or "build" or "public" based on your frontend framework

uploadDir(targetDir)
  .then(() => console.log("Upload complete!"))
  .catch((err) => console.error("Error uploading directory:", err));
