import express from "express";
import { createInstructor } from "../../controllers/instructor.controller/create.instructor.js";
import { getAllInstructors } from "../../controllers/instructor.controller/get.instructor.js";
import { supportDataForInstructor } from "../../controllers/instructor.controller/support.instructor.js";
import { getInstructorPayments } from "../../controllers/instructor.controller/get.instructor.payments.js";
import { deleteInstructor } from "../../controllers/instructor.controller/delete.instructor.js";
import { updateInstructor } from "../../controllers/instructor.controller/update.instructor.js";
import {
  getEmployeeAttendance,
  markEmployeeAttendance,
  markAllEmployeesAttendance,
  getEmployeeAttendanceSummary,
  getEmployeeMonthlyAttendanceMatrix,
  getAttendanceReminderStatus,
  testAttendanceReminder,
} from "../../controllers/instructor.controller/attendance.employee.js";
import {
  calculateEmployeeSalary,
  savePayrollCycle,
  recordAdvancePayment,
} from "../../controllers/instructor.controller/payroll.employee.js";

const app = express.Router()

app.post("/create-instructor" , createInstructor)
app.get("/get-instructor-data" , getAllInstructors)
app.get("/support-instructor" , supportDataForInstructor)
app.get("/get-instructor-payments/:id" , getInstructorPayments)
app.delete("/delete-instructor/:id", deleteInstructor)
app.put("/update-instructor/:id", updateInstructor)

// Employee Attendance Routes
app.get("/employee-attendance", getEmployeeAttendance)
app.post("/mark-employee-attendance", markEmployeeAttendance)
app.post("/mark-all-employees-attendance", markAllEmployeesAttendance)
app.get("/employee-attendance-summary", getEmployeeAttendanceSummary)
app.get("/employee-monthly-attendance-matrix", getEmployeeMonthlyAttendanceMatrix)

// Attendance Reminder Routes (End of Working Day Notification)
app.get("/attendance-reminder-status", getAttendanceReminderStatus)
app.post("/test-attendance-reminder", testAttendanceReminder)

// Per-day Salary Calculation & Payroll Routes
app.get("/calculate-employee-salary", calculateEmployeeSalary)
app.post("/save-payroll-cycle", savePayrollCycle)
app.post("/record-advance-payment", recordAdvancePayment)
app.post("/record-extra-payment", recordAdvancePayment)

export default app