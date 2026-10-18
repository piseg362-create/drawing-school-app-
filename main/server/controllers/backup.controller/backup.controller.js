import prisma from "../../config/database.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDbPath() {
  return process.env.DATABASE_PATH || path.resolve(process.cwd(), "dev.db");
}

export async function downloadBackup(req, res) {
  try {
    const dbPath = getDbPath();
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: "Database file not found." });
    }

    const stat = fs.statSync(dbPath);

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": stat.size,
      "Content-Disposition": "attachment; filename=dev.db"
    });

    const readStream = fs.createReadStream(dbPath);
    readStream.pipe(res);
  } catch (error) {
    console.error("Backup error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to download backup." });
    }
  }
}

export async function restoreBackup(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No backup file uploaded." });
    }

    const dbPath = getDbPath();
    
    // Disconnect Prisma so it releases any locks on the DB
    await prisma.$disconnect();
    
    // Copy the uploaded file to dev.db
    fs.copyFileSync(req.file.path, dbPath);
    
    // Clean up the uploaded temp file
    fs.unlinkSync(req.file.path);

    return res.status(200).json({ success: true, message: "Database restored successfully! Please restart the application." });
  } catch (error) {
    console.error("Restore error:", error);
    return res.status(500).json({ success: false, message: "Failed to restore backup." });
  }
}
