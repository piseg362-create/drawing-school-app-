import express from "express";
import { createStudent } from "../../controllers/student.controller/create.student.controller.js";
import { supportData } from "../../controllers/student.controller/support.student.contoller.js";
import { getAllStudents } from "../../controllers/student.controller/get.student.controller.js";
import { markPaymentComplete } from "../../controllers/student.controller/update.student.payment.js";
import { deleteStudent } from "../../controllers/student.controller/delete.student.controller.js";
import { updateStudent } from "../../controllers/student.controller/update.student.controller.js";
import { sendLicenseTestSchedule, updateLicenseTestStatus } from "../../controllers/student.controller/license.student.controller.js";

const app = express.Router()

app.post("/create-student" , createStudent)
app.get("/support-data" , supportData)
app.get("/get-student-data" , getAllStudents)
app.put("/mark-payment-complete/:id" , markPaymentComplete)
app.delete("/delete-student/:id", deleteStudent)
app.put("/update-student/:id", updateStudent)
app.post("/students/:id/send-license-test", sendLicenseTestSchedule)
app.put("/students/:id/license-test-status", updateLicenseTestStatus)

export default app