import express from "express";
import { getDashboardData } from "../controllers/dashboard.controller.js";

const app = express.Router();

app.get("/dashboard", getDashboardData);

export default app;
