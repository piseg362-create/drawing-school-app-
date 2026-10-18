import express from "express";
import { processLicensePayment, createRazorpayOrder } from "../../controllers/payment.controller/payment.controller.js";

const app = express.Router();

app.post("/create-order", createRazorpayOrder);
app.post("/license", processLicensePayment);

export default app;
