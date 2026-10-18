import prisma, { als } from "../../config/database.js";

/**
 * Valid attendance statuses
 */
const VALID_STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "NOT_TAKEN"];

/**
 * Get daily employee attendance for all active staff members
 */
export async function getEmployeeAttendance(req, res) {
  try {
    const { date, jobType, search } = req.query;

    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter active employees
    const instructorWhere = { isActive: true };
    if (jobType && jobType !== "ALL") {
      instructorWhere.jobType = jobType;
    }
    if (search && search.trim()) {
      const s = search.trim();
      instructorWhere.OR = [
        { name: { contains: s } },
        { mobile: { contains: s } },
      ];
    }

    const instructors = await prisma.instructor.findMany({
      where: instructorWhere,
      include: {
        car: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch attendance records for this date
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const attendanceMap = new Map();
    attendances.forEach((record) => {
      attendanceMap.set(record.instructorId, record);
    });

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let notTaken = 0;

    const data = instructors.map((inst) => {
      const record = attendanceMap.get(inst.id);
      const status = record ? record.status : "NOT_TAKEN";

      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "HALF_DAY") halfDay++;
      else if (status === "LEAVE") leave++;
      else notTaken++;

      return {
        id: inst.id,
        name: inst.name,
        mobile: inst.mobile,
        jobType: inst.jobType,
        joiningDate: inst.joiningDate,
        licenseNumber: inst.licenseNumber,
        car: inst.car ? inst.car.name : null,
        attendanceId: record?.id || null,
        status,
        note: record?.note || "",
        updatedAt: record?.updatedAt || null,
      };
    });

    const total = instructors.length;
    const rate = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

    return res.status(200).json({
      status: true,
      data,
      stats: {
        total,
        present,
        absent,
        halfDay,
        leave,
        notTaken,
        rate,
      },
    });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to fetch employee attendance",
    });
  }
}

/**
 * Mark or clear attendance for a single employee
 */
export async function markEmployeeAttendance(req, res) {
  try {
    const { instructorId, date, status, note } = req.body;

    if (!instructorId) {
      return res.status(400).json({
        status: false,
        message: "instructorId is required",
      });
    }

    const attendanceStatus = (status || "PRESENT").toUpperCase();
    if (!VALID_STATUSES.includes(attendanceStatus)) {
      return res.status(400).json({
        status: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: {
        instructorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (attendanceStatus === "NOT_TAKEN") {
      if (existing) {
        await prisma.attendance.delete({
          where: { id: existing.id },
        });
      }
      return res.status(200).json({
        status: true,
        message: "Attendance cleared",
        data: null,
      });
    }

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: attendanceStatus,
          note: note !== undefined ? String(note) : existing.note,
        },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          instructorId,
          date: startOfDay,
          status: attendanceStatus,
          note: note ? String(note) : "",
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: `Attendance marked as ${attendanceStatus}`,
      data: record,
    });
  } catch (error) {
    console.error("Error marking employee attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to mark employee attendance",
    });
  }
}

/**
 * Bulk mark attendance for multiple employees (e.g., Mark All Present)
 */
export async function markAllEmployeesAttendance(req, res) {
  try {
    const { instructorIds, date, status, note } = req.body;

    if (!Array.isArray(instructorIds) || instructorIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "instructorIds array is required",
      });
    }

    const attendanceStatus = (status || "PRESENT").toUpperCase();
    if (!VALID_STATUSES.includes(attendanceStatus)) {
      return res.status(400).json({
        status: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    for (const instructorId of instructorIds) {
      const existing = await prisma.attendance.findFirst({
        where: {
          instructorId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (attendanceStatus === "NOT_TAKEN") {
        if (existing) {
          await prisma.attendance.delete({
            where: { id: existing.id },
          });
        }
      } else if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: attendanceStatus,
            note: note !== undefined ? String(note) : existing.note,
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            instructorId,
            date: startOfDay,
            status: attendanceStatus,
            note: note ? String(note) : "",
          },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: `Marked ${instructorIds.length} staff as ${attendanceStatus}`,
    });
  } catch (error) {
    console.error("Error bulk marking employee attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to bulk mark employee attendance",
    });
  }
}

/**
 * Get attendance summary & history for a single employee
 */
export async function getEmployeeAttendanceSummary(req, res) {
  try {
    const { instructorId, month } = req.query;

    if (!instructorId) {
      return res.status(400).json({
        status: false,
        message: "instructorId is required",
      });
    }

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        car: true,
      },
    });

    if (!instructor) {
      return res.status(404).json({
        status: false,
        message: "Employee not found",
      });
    }

    const where = { instructorId };

    if (month) {
      // month formatted as YYYY-MM
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);

      const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endOfMonth = new Date(year, monthNum - 1, lastDay, 23, 59, 59, 999);

      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
    });

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    records.forEach((r) => {
      if (r.status === "PRESENT") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "HALF_DAY") halfDay++;
      else if (r.status === "LEAVE") leave++;
    });

    const totalMarked = records.length;
    const rate = totalMarked > 0 ? Math.round(((present + halfDay * 0.5) / totalMarked) * 100) : 0;

    return res.status(200).json({
      status: true,
      data: {
        instructor,
        stats: {
          present,
          absent,
          halfDay,
          leave,
          totalMarked,
          rate,
        },
        history: records,
      },
    });
  } catch (error) {
    console.error("Error fetching employee attendance summary:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to get employee attendance summary",
    });
  }
}

/**
 * Get monthly attendance matrix for all active employees
 * Ideal for month-grid view and PDF/Excel export
 */
export async function getEmployeeMonthlyAttendanceMatrix(req, res) {
  try {
    const today = new Date();
    const month = req.query.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthNum - 1, daysInMonth, 23, 59, 59, 999);

    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      include: {
        car: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Matrix lookup: { [instructorId]: { [day]: { status, note } } }
    const matrix = {};
    instructors.forEach((inst) => {
      matrix[inst.id] = {};
    });

    attendances.forEach((att) => {
      const attDate = new Date(att.date);
      const day = attDate.getDate();
      if (matrix[att.instructorId]) {
        matrix[att.instructorId][day] = {
          id: att.id,
          status: att.status,
          note: att.note || "",
        };
      }
    });

    // Summary stats per instructor for the month
    const statsByInstructor = {};
    instructors.forEach((inst) => {
      let present = 0;
      let absent = 0;
      let halfDay = 0;
      let leave = 0;

      const instDays = matrix[inst.id] || {};
      Object.values(instDays).forEach((dayData) => {
        if (dayData.status === "PRESENT") present++;
        else if (dayData.status === "ABSENT") absent++;
        else if (dayData.status === "HALF_DAY") halfDay++;
        else if (dayData.status === "LEAVE") leave++;
      });

      const totalMarked = present + absent + halfDay + leave;
      const rate = totalMarked > 0 ? Math.round(((present + halfDay * 0.5) / totalMarked) * 100) : 0;

      statsByInstructor[inst.id] = {
        present,
        absent,
        halfDay,
        leave,
        totalMarked,
        rate,
      };
    });

    return res.status(200).json({
      status: true,
      data: {
        month,
        year,
        monthNum,
        daysInMonth,
        instructors,
        matrix,
        statsByInstructor,
      },
    });
  } catch (error) {
    console.error("Error getting employee monthly attendance matrix:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to get employee monthly attendance matrix",
    });
  }
}

/**
 * Check if today's employee attendance is pending near end of working day (~1 hour before close)
 */
export async function getAttendanceReminderStatus(req, res) {
  try {
    let school = await prisma.schoolSetUp.findFirst();
    if (!school && !als.getStore()) {
      school = await als.run('__BYPASS_TENANT__', () => prisma.schoolSetUp.findFirst());
    }

    if (!school) {
      return res.status(200).json({
        status: true,
        reminderNeeded: false,
        message: "No school setup found",
      });
    }

    const isEnabled = school.enableAttendanceReminder ?? true;
    if (!isEnabled) {
      return res.status(200).json({
        status: true,
        reminderNeeded: false,
        message: "Attendance reminder is disabled in settings",
      });
    }

    const workingStartTime = school.workingStartTime || "09:00";
    const workingEndTime = school.workingEndTime || "19:00";
    const reminderLead = Number(school.reminderBeforeMinutes) || 60;

    const [endH, endM] = workingEndTime.split(":").map(Number);
    const endMinutes = endH * 60 + (endM || 0);
    const triggerMinutes = Math.max(0, endMinutes - reminderLead);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if we are at or past the reminder trigger time (e.g. 18:00 if closing is 19:00 and lead is 60m)
    const isWithinReminderWindow = currentMinutes >= triggerMinutes;

    // Check today's date range
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let activeInstructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, jobType: true, mobile: true },
      orderBy: { name: "asc" },
    });
    if (activeInstructors.length === 0 && !als.getStore()) {
      activeInstructors = await als.run('__BYPASS_TENANT__', () =>
        prisma.instructor.findMany({
          where: { isActive: true },
          select: { id: true, name: true, jobType: true, mobile: true },
          orderBy: { name: "asc" },
        })
      );
    }

    if (activeInstructors.length === 0) {
      return res.status(200).json({
        status: true,
        reminderNeeded: false,
        message: "No active employees found",
      });
    }

    let markedRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      select: { instructorId: true, status: true },
    });
    if (markedRecords.length === 0 && !als.getStore()) {
      markedRecords = await als.run('__BYPASS_TENANT__', () =>
        prisma.attendance.findMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
          select: { instructorId: true, status: true },
        })
      );
    }

    const markedIds = new Set(markedRecords.map((r) => r.instructorId));
    const missingInstructors = activeInstructors.filter((inst) => !markedIds.has(inst.id));

    const isAttendancePending = missingInstructors.length > 0;
    const reminderNeeded = isWithinReminderWindow && isAttendancePending;

    const minutesLeft = endMinutes - currentMinutes;

    const triggerHoursStr = Math.floor(triggerMinutes / 60).toString().padStart(2, "0");
    const triggerMinsStr = (triggerMinutes % 60).toString().padStart(2, "0");
    const triggerTimeStr = `${triggerHoursStr}:${triggerMinsStr}`;

    return res.status(200).json({
      status: true,
      reminderNeeded,
      isWithinReminderWindow,
      isAttendancePending,
      workingStartTime,
      workingEndTime,
      reminderBeforeMinutes: reminderLead,
      triggerTime: triggerTimeStr,
      minutesLeft: minutesLeft > 0 ? minutesLeft : 0,
      totalEmployees: activeInstructors.length,
      markedCount: markedRecords.length,
      pendingCount: missingInstructors.length,
      missingEmployeeNames: missingInstructors.map((i) => i.name),
      schoolName: school.school_name,
      message: reminderNeeded
        ? `⏰ Working day ends at ${workingEndTime}. Attendance for ${missingInstructors.length} employee(s) has not been marked today! Please record attendance to maintain accurate salary & work records.`
        : (isAttendancePending
          ? `Attendance pending for ${missingInstructors.length} employee(s). Reminder will trigger at ${triggerTimeStr} (${reminderLead} mins before closing).`
          : "All active employee attendance has been recorded for today!"),
    });
  } catch (error) {
    console.error("Error checking attendance reminder status:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to check attendance reminder status",
    });
  }
}

/**
 * Trigger a test attendance reminder notification
 */
export async function testAttendanceReminder(req, res) {
  try {
    const school = await prisma.schoolSetUp.findFirst();
    const workingEndTime = school?.workingEndTime || "19:00";
    const schoolName = school?.school_name || "Driving School";

    return res.status(200).json({
      status: true,
      message: `Test attendance reminder triggered for ${schoolName}! Working day closing time: ${workingEndTime}.`,
      data: {
        schoolName,
        workingEndTime,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to trigger test reminder",
    });
  }
}
