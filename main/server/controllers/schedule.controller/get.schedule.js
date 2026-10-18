import prisma from "../../config/database.js";

export async function getSchedules(req, res) {
  try {
    const queryDateStr = req.query.date;
    const targetDate = queryDateStr ? new Date(queryDateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany();

    // Fetch related students and cars
    const studentIds = schedules.map(s => s.student_id).filter(Boolean);
    const carIds = schedules.map(s => s.Car_id).filter(Boolean);

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        instructor: true
      }
    });

    const cars = await prisma.car.findMany({
      where: { id: { in: carIds } },
    });

    // Fetch attendance for these students on the selected date
    const attendances = await prisma.studentAttendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const attendanceMap = {};
    attendances.forEach(a => {
      attendanceMap[a.studentId] = a;
    });

    const studentMap = {};
    students.forEach(s => studentMap[s.id] = s);

    const carMap = {};
    cars.forEach(c => carMap[c.id] = c);

    const now = new Date();
    const schedulesToDelete = [];

    const enrichedSchedules = schedules.reduce((acc, schedule) => {
      const student = studentMap[schedule.student_id];
      const car = carMap[schedule.Car_id];

      if (student) {
        let isExpired = false;
        
        // Check if student's course has expired (passed 20 days or Course_End_Date)
        if (student.Course_End_Date && new Date(student.Course_End_Date) < now) {
          isExpired = true;
        } else if (student.Course_Start_date && !student.Course_End_Date) {
          const endDate = new Date(student.Course_Start_date);
          endDate.setDate(endDate.getDate() + 20); // Fallback to 20 days if no end date
          if (endDate < now) {
            isExpired = true;
          }
        }

        if (isExpired) {
          schedulesToDelete.push(schedule.id);
          return acc;
        }
      } else {
        // Orphaned schedule (student was deleted), clean it up too
        schedulesToDelete.push(schedule.id);
        return acc;
      }

      let status = "Upcoming";
      let color = "border-[#c1552c] bg-white dark:bg-black"; // Brand border, clean bg

      if (schedule.Batch_time) {
        const parts = schedule.Batch_time.split("-");
        if (parts.length === 2) {
          const parseToMinutes = (timeStr) => {
            const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return 0;
            let h = parseInt(match[1], 10);
            if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
            if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
            return h * 60 + parseInt(match[2], 10);
          };

          const startMins = parseToMinutes(parts[0]);
          const endMins = parseToMinutes(parts[1]);
          const currentMins = now.getHours() * 60 + now.getMinutes();

          if (currentMins >= startMins && currentMins <= endMins) {
            status = "Running";
          } else if (currentMins > endMins) {
            status = "Completed";
          } else {
            status = "Upcoming";
          }
        }
      }

      const attRecord = attendanceMap[student.id];
      const attStatus = attRecord ? attRecord.status : "NOT_MARKED";

      acc.push({
        id: schedule.id,
        studentId: student.id,
        studentMobile: student.mobile,
        time: schedule.Batch_time,
        duration: schedule.Duration_time,
        student: student.name,
        instructor: student.instructor ? student.instructor.name : "Unassigned",
        vehicle: car ? car.name : "Unknown Vehicle",
        type: student.package_name || "General Course",
        status: status,
        color: color,
        attendanceStatus: attStatus,
        attendanceNote: attRecord?.note || "",
        attendanceId: attRecord?.id || null,
      });

      return acc;
    }, []);

    // Asynchronously delete expired/orphaned schedules from the database
    if (schedulesToDelete.length > 0) {
      prisma.schedule.deleteMany({
        where: { id: { in: schedulesToDelete } }
      }).catch(err => console.error("Error deleting expired schedules:", err));
    }

    return res.status(200).json({
      status: true,
      message: "Schedules fetched successfully",
      data: enrichedSchedules,
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Something went wrong",
    });
  }
}
