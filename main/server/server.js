try { process.loadEnvFile(); } catch (e) {}
import express from 'express'
import cors from 'cors'

import setUpStatus from "../server/routes/setup.route/setup.js"
import schoolSetUp from '../server/routes/setup.route/setupdata.route/setupdata.route.js'
import student from "../server/routes/student.route/create.student.route.js"
import instructor from "../server/routes/instructor.route/instructor.route.js"
import car from "../server/routes/car.route/car.route.js"
import schedule from "../server/routes/schedule.route/schedule.route.js"
import demo from "../server/routes/demo.route/demo.route.js"
import messageRoute from "../server/routes/message.route/message.route.js"
import whatsappRoute from "../server/routes/whatsapp.route/whatsapp.route.js"
import calendarRoute from "../server/routes/calendar.route/calendar.route.js"
import paymentRoute from "../server/routes/payment.route/payment.route.js"
import backupRoute from "../server/routes/backup.route/backup.route.js"
import dashboardRoute from "../server/routes/dashboard.route.js"
import { initMessageWorker } from '../worker/messageWorker.js'
import { initPayrollWorker } from '../worker/payrollWorker.js'
import { initAttendanceReminderWorker } from '../worker/attendanceReminderWorker.js'
import { als } from './config/database.js'

export function startExpressServer() {
  try {
    const expressApp = express()
    const port = 49215

    // Middleware
    expressApp.use(cors())

    // Parse JSON request body
    expressApp.use(express.json())

    // Parse form data
    expressApp.use(express.urlencoded({ extended: true }))

    // Multi-tenant Middleware
    expressApp.use((req, res, next) => {
      const rawSystemId = req.headers['x-system-id'] || req.headers['systemid'] || req.body?.systemID || req.query?.systemID;
      const systemId = typeof rawSystemId === 'string' ? rawSystemId.trim() : null;
      if (systemId && systemId !== 'undefined' && systemId !== 'null' && systemId !== '') {
        als.run(systemId, () => {
          next();
        });
      } else {
        next();
      }
    });

    // Test API
    expressApp.get('/api', (req, res) => {
      res.json({
        message: 'Express API working perfectly from Electron!'
      })
    })


    // Routes
    expressApp.use("/api", setUpStatus)
    expressApp.use("/api", schoolSetUp)
    expressApp.use("/api", student)
    expressApp.use("/api", instructor)
    expressApp.use("/api", car)
    expressApp.use("/api", schedule)
    expressApp.use("/api", demo)
    expressApp.use("/api", messageRoute)
    expressApp.use("/api", whatsappRoute)
    expressApp.use("/api", calendarRoute)
    expressApp.use("/api/payment", paymentRoute)
    expressApp.use("/api/backup", backupRoute)
    expressApp.use("/api", dashboardRoute)



    // Start Server
    const server = expressApp.listen(port, '0.0.0.0', () => {
      console.log(`✅ Background Express Server running on port ${port}`)
    })
    
    // Start Background Workers
    initMessageWorker();
    initPayrollWorker();
    initAttendanceReminderWorker();



    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use!`)
      } else {
        console.error('❌ Express Server Error:', err)
      }
    })

  } catch (error) {
    console.error('❌ Fatal error while starting Express Server:', error)
  }
}