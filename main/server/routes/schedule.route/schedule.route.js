import express from "express";
import { getSchedules } from "../../controllers/schedule.controller/get.schedule.js";
import {
  markStudentAttendance,
  getStudentAttendance,
  markAllStudentsAttendance,
  getStudentAttendanceSummary,
} from "../../controllers/schedule.controller/attendance.student.js";

const scheduleRoute = express.Router();

scheduleRoute.get("/get-schedules", getSchedules);
scheduleRoute.post("/mark-student-attendance", markStudentAttendance);
scheduleRoute.get("/get-student-attendance", getStudentAttendance);
scheduleRoute.post("/mark-all-students-attendance", markAllStudentsAttendance);
scheduleRoute.get("/student-attendance-summary", getStudentAttendanceSummary);

export default scheduleRoute;
