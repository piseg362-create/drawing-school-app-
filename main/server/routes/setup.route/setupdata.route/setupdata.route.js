import express from "express";
import { saveSchoolData, getSchoolData } from "../../../controllers/data.setup/school.setup.js";
import { saveInstructorData } from "../../../controllers/data.setup/intructor.setup.js";
import { saveCarData } from "../../../controllers/data.setup/car.setup.js";
import { savePackageData } from "../../../controllers/data.setup/package.setup.js";


const app = express.Router()

app.post("/school-setup" , saveSchoolData)
app.get("/school-setup" , getSchoolData)
app.post("/instructor-setup" , saveInstructorData)
app.post("/car-setup" , saveCarData)
app.post("/package-setup" , savePackageData)


export default app