import prisma, { als } from "../server/config/database.js";

let lastTriggeredDate = null;

async function getNotificationClass() {
  try {
    const electron = await import("electron");
    return electron.Notification || electron.default?.Notification;
  } catch (e) {
    return null;
  }
}

/**
 * Attendance Reminder Background Worker
 * Checks if working day is ending soon (~1 hour before close) and attendance has not been marked.
 * Sends native OS desktop notifications to the admin / receptionist so attendance is recorded accurately.
 */
export function initAttendanceReminderWorker() {
  console.log("⏰ Attendance Reminder Worker Initialized. Monitoring end-of-day attendance...");

  // Initial check 5 seconds after startup
  setTimeout(checkAttendanceReminder, 5000);

  // Check every 60 seconds
  setInterval(checkAttendanceReminder, 60 * 1000);
}

export async function checkAttendanceReminder() {
  als.run('__BYPASS_TENANT__', async () => {
    try {
      const school = await prisma.schoolSetUp.findFirst();
      if (!school) return;

      const isReminderEnabled = school.enableAttendanceReminder ?? true;
      if (!isReminderEnabled) return;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Prevent repeated notifications on the same day
      if (school.lastAttendanceReminderDate === todayStr || lastTriggeredDate === todayStr) {
        return;
      }

      const workingEndTime = school.workingEndTime || "19:00";
      const reminderLead = Number(school.reminderBeforeMinutes) || 60;

      const [endH, endM] = workingEndTime.split(":").map(Number);
      const endMinutes = endH * 60 + (endM || 0);
      const triggerMinutes = Math.max(0, endMinutes - reminderLead);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Check if current time is within reminder window:
      // from (end - lead) up to (end + 120 minutes)
      if (currentMinutes < triggerMinutes || currentMinutes > endMinutes + 120) {
        return;
      }

      // Check today's employee attendance
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const activeInstructors = await prisma.instructor.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      });

      if (activeInstructors.length === 0) return;

      const markedRecords = await prisma.attendance.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        },
        select: { instructorId: true }
      });

      const markedIds = new Set(markedRecords.map(r => r.instructorId));
      const missingCount = activeInstructors.filter(i => !markedIds.has(i.id)).length;

      if (missingCount > 0) {
        console.log(`⏰ [ATTENDANCE REMINDER TRIGGERED] Working day ends at ${workingEndTime}. Attendance for ${missingCount} instructor(s) has not been taken yet!`);

        try {
          const NotificationClass = await getNotificationClass();
          if (NotificationClass && NotificationClass.isSupported()) {
            new NotificationClass({
              title: "⏰ Attendance Reminder",
              body: `Working day ends at ${workingEndTime} (~${reminderLead} mins left). Attendance for ${missingCount} employee(s) has not been marked yet! Please record attendance to maintain accurate records.`,
            }).show();
          }
        } catch (e) {
          console.warn("Could not show Electron notification:", e.message);
        }

        lastTriggeredDate = todayStr;
        await prisma.schoolSetUp.update({
          where: { id: school.id },
          data: { lastAttendanceReminderDate: todayStr }
        });
      }
    } catch (err) {
      console.error("❌ Error in Attendance Reminder Worker:", err);
    }
  });
}
