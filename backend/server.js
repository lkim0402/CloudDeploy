import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadDir, uploadAndGetS3Link } from "./deploy.js"; // You’ll export this from your deploy script
import unzipper from "unzipper";

const app = express();
const port = 3000;

// setup: __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serving frontend/index.html when people visit the server
app.use(express.static(path.join(__dirname, "../frontend")));

// storing uploaded files in uploads/ folder
const upload = multer({ dest: "uploads/" });

// multer expects one file in the form w/ field name zipfile
app.post("/upload", upload.single("zipfile"), async (req, res) => {
  try {
    // ensure extractPath exists
    const extractPath = path.join(__dirname, "../unzipped");
    fs.mkdirSync(extractPath, { recursive: true });

    // ======= Unzip =======
    // path im gonna extract
    const zipPath = req.file.path;
    fs.createReadStream(zipPath) // reads the uploaded zip file
      // extract the ZIP to the 'unzipped' folder
      .pipe(unzipper.Extract({ path: extractPath }))
      .on("close", async () => {
        // get the first folder/file inside "unzipped"
        const innerFiles = fs.readdirSync(extractPath);
        const firstItemPath = path.join(extractPath, innerFiles[0]);

        const stats = fs.statSync(firstItemPath);
        const contentPath = stats.isDirectory() ? firstItemPath : extractPath;

        // Now pass the real content folder to uploadAndGetS3Link
        const { fileNum, linkS3 } = await uploadAndGetS3Link(contentPath);
        res.send({ fileNum: fileNum, linkS3: linkS3 });
      });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
