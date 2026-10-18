import prisma from "../config/database.js";

export async function getDashboardData(req, res) {
  try {
    // 1. Get all students
    const students = await prisma.student.findMany();
    const activeStudentsCount = students.filter(s => s.Enrollment_status === 'CHOSEN' || s.Enrollment_status === 'ACTIVE').length;

    // 2. Get all schedules (representing today's lessons since they are daily and deleted when expired)
    const schedules = await prisma.schedule.findMany();
    const todayLessonsCount = schedules.length;

    // 3. Get all cars
    const cars = await prisma.car.findMany();
    const totalCarsCount = cars.length;
    // Find cars that are in use (assigned to a schedule)
    const inUseCarIds = new Set(schedules.map(s => s.Car_id).filter(Boolean));
    const availableCarsCount = totalCarsCount - inUseCarIds.size;

    // 4. Get settled (amount paid) and pending (remaining amount) from students
    let totalSettled = 0;
    let totalPending = 0;
    let totalPackageValue = 0;
    
    for (const student of students) {
      totalSettled += student.Amount_paid || 0;
      totalPending += student.remaining_amount || 0;
      totalPackageValue += (student.Total_amount != null ? Number(student.Total_amount) : ((student.Amount_paid || 0) + (student.remaining_amount || 0)));
    }

    // Format for display
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
    
    const formattedSettled = formatter.format(totalSettled);
    const formattedPending = formatter.format(totalPending);
    const formattedTotal = formatter.format(totalPackageValue);
    const collectionRate = totalPackageValue > 0 ? Math.round((totalSettled / totalPackageValue) * 100) : 0;

    // 5. Weekly classes activity (Mock or derived from CalendarEvent if available)
    // Since Schedule doesn't hold history, we will return some sample data or try to get it from CalendarEvent
    // For now, let's keep the mock data for the chart, as there is no historical attendance log easily queried.
    const weeklyActivity = [
      { day: "Mon", classes: 12 },
      { day: "Tue", classes: 18 },
      { day: "Wed", classes: 15 },
      { day: "Thu", classes: 24 },
      { day: "Fri", classes: 20 },
      { day: "Sat", classes: 32 },
      { day: "Sun", classes: 28 },
    ];

    // 6. Enrich today's schedules
    const studentIds = schedules.map(s => s.student_id).filter(Boolean);
    const carIds = schedules.map(s => s.Car_id).filter(Boolean);

    const scheduleStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { instructor: true }
    });

    const scheduleCars = await prisma.car.findMany({
      where: { id: { in: carIds } },
    });

    const studentMap = {};
    scheduleStudents.forEach(s => studentMap[s.id] = s);

    const carMap = {};
    scheduleCars.forEach(c => carMap[c.id] = c);

    const enrichedSchedules = schedules.reduce((acc, schedule) => {
      const student = studentMap[schedule.student_id];
      const car = carMap[schedule.Car_id];

      if (!student) return acc;

      const colors = [
        "bg-blue-100 text-blue-600 dark:bg-blue-900/40",
        "bg-green-100 text-green-600 dark:bg-green-900/40",
        "bg-purple-100 text-purple-600 dark:bg-purple-900/40",
        "bg-orange-100 text-orange-600 dark:bg-orange-900/40"
      ];
      const color = colors[acc.length % colors.length];
      
      const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      let timeParts = schedule.Batch_time ? schedule.Batch_time.split("-") : ["", ""];
      let timeStr = timeParts[0] ? timeParts[0].trim() : "TBD";

      acc.push({
        name: student.name,
        time: timeStr,
        duration: schedule.Duration_time || "1 hr",
        type: student.package_name || "General Course",
        car: car ? car.name : "Unknown",
        initial: initials || "ST",
        color: color
      });

      return acc;
    }, []);

    // 7. WhatsApp Automation & Meta Spend Analytics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSent = await prisma.messageQueue.count({
      where: { status: "SENT" },
    });

    const monthSent = await prisma.messageQueue.count({
      where: {
        status: "SENT",
        sentAt: { gte: startOfMonth },
      },
    });

    const pendingCount = await prisma.messageQueue.count({
      where: { status: "PENDING" },
    });

    const failedCount = await prisma.messageQueue.count({
      where: { status: "FAILED" },
    });

    // Breakdown by template category & name
    const sentMessages = await prisma.messageQueue.findMany({
      where: { status: "SENT" },
      select: {
        sentAt: true,
        template: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    let utilityCount = 0;
    let marketingCount = 0;
    const templateBreakdown = {};

    for (const msg of sentMessages) {
      const cat = msg.template?.category || "UTILITY";
      if (cat === "MARKETING") {
        marketingCount++;
      } else {
        utilityCount++;
      }
      const tName = msg.template?.name || "other";
      templateBreakdown[tName] = (templateBreakdown[tName] || 0) + 1;
    }

    const token = await prisma.whatsAppToken.findFirst({
      select: {
        safeMode: true,
        switchOffMode: true,
        monthlyBudget: true,
        utilityRate: true,
        wabaId: true,
        phoneNumberId: true,
        displayPhoneNumber: true,
        verifiedName: true,
        status: true,
      },
    });

    // Meta Pricing (Utility rate configurable, typical range ₹0.12 - ₹0.18 INR; Marketing: ₹0.80 INR)
    const utilityRate = token?.utilityRate != null ? Number(token.utilityRate) : 0.15;
    const MARKETING_RATE = 0.80;

    const totalCostINR = (utilityCount * utilityRate + marketingCount * MARKETING_RATE).toFixed(2);

    const monthSentList = sentMessages.filter(
      (m) => m.sentAt && new Date(m.sentAt) >= startOfMonth
    );
    let monthUtility = 0;
    let monthMarketing = 0;
    for (const msg of monthSentList) {
      if (msg.template?.category === "MARKETING") monthMarketing++;
      else monthUtility++;
    }
    const monthCostINR = (monthUtility * utilityRate + monthMarketing * MARKETING_RATE).toFixed(2);

    const whatsappStats = {
      isConnected: Boolean(token && token.status === "ACTIVE"),
      totalSent,
      monthSent,
      pendingCount,
      failedCount,
      utilityCount,
      marketingCount,
      totalCostINR: `₹${totalCostINR}`,
      monthCostINR: `₹${monthCostINR}`,
      templateBreakdown,
      safeMode: token ? Boolean(token.safeMode) : true,
      switchOffMode: token ? Boolean(token.switchOffMode) : false,
      monthlyBudget: Number(token?.monthlyBudget) || 150.0,
      utilityRate,
      monthlyPaymentAllowed: true,
      wabaId: token?.wabaId || null,
      phoneNumberId: token?.phoneNumberId || null,
      displayPhoneNumber: token?.displayPhoneNumber || null,
      verifiedName: token?.verifiedName || null,
    };

    res.json({
      success: true,
      data: {
        activeStudents: activeStudentsCount,
        todayLessons: todayLessonsCount,
        availableCars: availableCarsCount,
        totalCars: totalCarsCount,
        settledAmount: formattedSettled,
        pendingAmount: formattedPending,
        totalAmount: formattedTotal,
        collectionRate,
        weeklyActivity,
        todaySchedules: enrichedSchedules,
        whatsappStats,
      },
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
