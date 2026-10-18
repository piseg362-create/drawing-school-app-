import express from "express";
import { verifyAndSaveWhatsAppToken, saveWhatsAppToken, autoRegisterNumber } from "../../controllers/whatsapp.controller/whatsapp.controller.js";
import { getTemplates, createTemplate } from "../../controllers/whatsapp.controller/template.controller.js";
import { getSettings, updateSettings } from "../../controllers/whatsapp.controller/settings.controller.js";

const router = express.Router();

router.post("/whatsapp/verify-setup", verifyAndSaveWhatsAppToken);
router.post("/whatsapp/save-token", saveWhatsAppToken);
router.get("/whatsapp/register-number", autoRegisterNumber);
router.get("/whatsapp/templates", getTemplates);
router.post("/whatsapp/templates", createTemplate);
router.get("/whatsapp/settings", getSettings);
router.post("/whatsapp/settings", updateSettings);

export default router;
