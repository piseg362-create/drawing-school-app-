import prisma from "../../config/database.js";

export async function markStudentAttendance(req, res) {
  try {
    const { studentId, date, status, note } = req.body;

    if (!studentId) {
      return res.status(400).json({
        status: false,
        message: "studentId is required",
      });
    }

    const attendanceStatus = (status || "PRESENT").toUpperCase(); // "PRESENT", "ABSENT", "NOT_MARKED"

    // Parse date (default to today if missing)
    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance record already exists for this student on this day
    const existing = await prisma.studentAttendance.findFirst({
      where: {
        studentId: studentId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (attendanceStatus === "NOT_MARKED") {
      if (existing) {
        await prisma.studentAttendance.delete({
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
      record = await prisma.studentAttendance.update({
        where: { id: existing.id },
        data: {
          status: attendanceStatus,
          note: note !== undefined ? note : existing.note,
        },
      });
    } else {
      record = await prisma.studentAttendance.create({
        data: {
          studentId: studentId,
          date: startOfDay,
          status: attendanceStatus,
          note: note || null,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: `Attendance marked as ${attendanceStatus}`,
      data: record,
    });
  } catch (error) {
    console.error("Error marking student attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to mark student attendance",
    });
  }
}

export async function getStudentAttendance(req, res) {
  try {
    const { studentId, date } = req.query;

    const where = {};
    if (studentId) where.studentId = studentId;

    if (date) {
      const baseDate = new Date(date);
      const startOfDay = new Date(baseDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(baseDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const records = await prisma.studentAttendance.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return res.status(200).json({
      status: true,
      data: records,
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to fetch student attendance",
    });
  }
}

export async function markAllStudentsAttendance(req, res) {
  try {
    const { studentIds, date, status } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "studentIds array is required",
      });
    }

    const attendanceStatus = (status || "PRESENT").toUpperCase();
    const baseDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    for (const studentId of studentIds) {
      const existing = await prisma.studentAttendance.findFirst({
        where: {
          studentId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (existing) {
        await prisma.studentAttendance.update({
          where: { id: existing.id },
          data: { status: attendanceStatus },
        });
      } else {
        await prisma.studentAttendance.create({
          data: {
            studentId,
            date: startOfDay,
            status: attendanceStatus,
          },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: `Marked ${studentIds.length} students as ${attendanceStatus}`,
    });
  } catch (error) {
    console.error("Error bulk marking attendance:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to bulk mark attendance",
    });
  }
}

export async function getStudentAttendanceSummary(req, res) {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ status: false, message: "studentId is required" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        instructor: true,
        car: true,
      },
    });

    if (!student) {
      return res.status(404).json({ status: false, message: "Student not found" });
    }

    const records = await prisma.studentAttendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
    });

    const totalPresent = records.filter(r => r.status === "PRESENT").length;
    const totalAbsent = records.filter(r => r.status === "ABSENT").length;

    return res.status(200).json({
      status: true,
      data: {
        student,
        totalPresent,
        totalAbsent,
        totalMarked: records.length,
        history: records,
      },
    });
  } catch (error) {
    console.error("Error getting student attendance summary:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to get student attendance summary",
    });
  }
}
