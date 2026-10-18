import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { downloadBackup, restoreBackup } from "../../controllers/backup.controller/backup.controller.js";

const app = express.Router();

const uploadDir = path.join(os.tmpdir(), "drawing-pro-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

app.get("/download", downloadBackup);
app.post("/restore", upload.single('dbfile'), restoreBackup);

export default app;
