import {
  S3Client,
  PutObjectCommand,
  S3ServiceException,
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

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadAndGetS3Link = async (dirPath) => {
  try {
    const fileNum = await uploadDir(dirPath);
    const s3Link = generateS3Link();
    return { filenum: fileNum, link: s3Link };
  } catch (e) {
    console.error("Error uploading directory: ", e);
    throw e;
  }
};

// =========== helper functions ===========

const uploadFile = async (filePath, keyName) => {
  try {
    const fileContent = fs.readFileSync(filePath);

    // Dynamically set the file's MIME type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream"; // Default MIME type

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: keyName,
      Body: fileContent,
      ContentType: contentType,
      ACL: "public-read", // Makes the file publicly accessible
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await client.send(command);
    console.log(`File uploaded successfully: ${keyName}`);
  } catch (err) {
    if (err instanceof S3ServiceException) {
      console.error(`${err.name}: ${err.message}`);
    } else {
      throw err;
    }
  }
};

// Recursive function to upload all files in the directory
export const uploadDir = async (dirPath, basePath = dirPath) => {
  const entries = fs.readdirSync(dirPath); // array
  let fileCount = 0;

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);

    // if directory
    if (fs.lstatSync(entryPath).isDirectory()) {
      const { fileCount: nestedCount } = await uploadDir(entryPath, basePath);

      // updating values
      fileCount += nestedCount;
    }
    // if file
    else {
      const relativePath = path.relative(basePath, entryPath);
      await uploadFile(entryPath, relativePath);
      fileCount++;
    }
  }

  // Once upload is complete, return the list of uploaded files' links
  return fileCount;
};

export const generateS3Link = () => {
  return `http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com`;
};
