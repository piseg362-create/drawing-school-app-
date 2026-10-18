import prisma from "../../config/database.js";

/**
 * Calculate employee monthly salary based on daily attendance records
 */
export async function calculateEmployeeSalary(req, res) {
  try {
    const { instructorId, month, calculationBasis = "calendar", includeLeavesAsPaid = "false" } = req.query;

    if (!instructorId) {
      return res.status(400).json({
        status: false,
        message: "instructorId is required",
      });
    }

    const today = new Date();
    const targetMonth = month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [yearStr, monthStr] = targetMonth.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthNum - 1, daysInMonth, 23, 59, 59, 999);

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { car: true },
    });

    if (!instructor) {
      return res.status(404).json({
        status: false,
        message: "Employee not found",
      });
    }

    const baseSalary = Number(instructor.payment) || 0;

    // Fetch all attendance records for this instructor in this month
    const records = await prisma.attendance.findMany({
      where: {
        instructorId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: "asc" },
    });

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;

    records.forEach((r) => {
      if (r.status === "PRESENT") presentDays++;
      else if (r.status === "ABSENT") absentDays++;
      else if (r.status === "HALF_DAY") halfDays++;
      else if (r.status === "LEAVE") leaveDays++;
    });

    const isPaidLeave = includeLeavesAsPaid === "true";
    const totalMarkedDays = presentDays + absentDays + halfDays + leaveDays;

    // Effective payable days
    // Present = 1 day, Half Day = 0.5 day, Leave = 1 day if paid leave else 0
    let effectivePresentDays = presentDays + halfDays * 0.5 + (isPaidLeave ? leaveDays : 0);

    // If no attendance was logged at all in this month, treat as full base salary
    const hasAttendanceData = totalMarkedDays > 0;
    if (!hasAttendanceData) {
      effectivePresentDays = daysInMonth;
    }

    // Calculation divisor
    let divisor = daysInMonth;
    if (calculationBasis === "30_days") {
      divisor = 30;
    } else if (calculationBasis === "26_days") {
      divisor = 26; // Standard 26 working days (excluding Sundays)
    }

    // Daily rate & Earned salary
    const dailyRate = divisor > 0 ? Math.round((baseSalary / divisor) * 100) / 100 : 0;
    let earnedSalary = hasAttendanceData
      ? Math.round(effectivePresentDays * dailyRate)
      : baseSalary;

    // Cap earned salary at baseSalary if not exceeding
    if (calculationBasis === "calendar" && earnedSalary > baseSalary) {
      earnedSalary = baseSalary;
    }

    const lossOfPayDeduction = Math.max(0, baseSalary - earnedSalary);

    // Fetch existing PaymentCycle for this month
    const existingCycle = await prisma.paymentCycle.findFirst({
      where: {
        instructorId,
        month: startOfMonth,
      },
      include: {
        paymentsTaken: true,
      },
    });

    // Calculate advances taken
    let totalAdvances = 0;
    if (existingCycle) {
      totalAdvances = existingCycle.amountTaken || 0;
    } else {
      const advancesAgg = await prisma.paymentTaken.aggregate({
        where: {
          paymentCycle: { instructorId },
          takenAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      });
      totalAdvances = advancesAgg._sum.amount || 0;
    }

    const bonuses = existingCycle?.bonus || 0;
    const otherDeductions = (existingCycle?.deductions || 0) > lossOfPayDeduction
      ? existingCycle.deductions - lossOfPayDeduction
      : 0;

    const netPayable = Math.max(0, earnedSalary - totalAdvances - otherDeductions + bonuses);

    return res.status(200).json({
      status: true,
      data: {
        instructor: {
          id: instructor.id,
          name: instructor.name,
          mobile: instructor.mobile,
          jobType: instructor.jobType,
          paymentDate: instructor.paymentDate,
          car: instructor.car?.name || null,
        },
        month: targetMonth,
        daysInMonth,
        divisor,
        calculationBasis,
        includeLeavesAsPaid: isPaidLeave,
        attendance: {
          presentDays,
          halfDays,
          absentDays,
          leaveDays,
          unmarkedDays: Math.max(0, daysInMonth - totalMarkedDays),
          totalMarkedDays,
          effectivePresentDays,
          hasAttendanceData,
        },
        salaryBreakdown: {
          baseSalary,
          dailyRate,
          effectivePresentDays,
          earnedSalary,
          lossOfPayDeduction,
          totalAdvances,
          otherDeductions,
          bonuses,
          netPayable,
        },
        existingCycle,
      },
    });
  } catch (error) {
    console.error("Error calculating employee salary:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to calculate employee salary",
    });
  }
}

/**
 * Save or update monthly payroll cycle record
 */
export async function savePayrollCycle(req, res) {
  try {
    const {
      instructorId,
      month,
      baseAmount,
      deductions = 0,
      bonus = 0,
      amountTaken = 0,
      netAmount,
      status = "PENDING",
      note = "",
      paidAt,
    } = req.body;

    if (!instructorId || !month) {
      return res.status(400).json({
        status: false,
        message: "instructorId and month (YYYY-MM) are required",
      });
    }

    const [yearStr, monthStr] = month.split("-");
    const monthStart = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1, 0, 0, 0, 0);

    const calculatedNet = netAmount !== undefined
      ? Number(netAmount)
      : Math.max(0, Number(baseAmount) - Number(deductions) - Number(amountTaken) + Number(bonus));

    const existing = await prisma.paymentCycle.findFirst({
      where: {
        instructorId,
        month: monthStart,
      },
    });

    let cycle;
    if (existing) {
      cycle = await prisma.paymentCycle.update({
        where: { id: existing.id },
        data: {
          baseAmount: Math.round(Number(baseAmount)),
          deductions: Math.round(Number(deductions)),
          bonus: Math.round(Number(bonus)),
          amountTaken: Math.round(Number(amountTaken)),
          netAmount: Math.round(calculatedNet),
          status,
          note: note || existing.note,
          paidAt: paidAt ? new Date(paidAt) : existing.paidAt,
        },
      });
    } else {
      cycle = await prisma.paymentCycle.create({
        data: {
          instructorId,
          month: monthStart,
          baseAmount: Math.round(Number(baseAmount)),
          deductions: Math.round(Number(deductions)),
          bonus: Math.round(Number(bonus)),
          amountTaken: Math.round(Number(amountTaken)),
          netAmount: Math.round(calculatedNet),
          status,
          note: note || `Payroll for ${monthStart.toLocaleString("default", { month: "long", year: "numeric" })}`,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Payroll cycle saved successfully",
      data: cycle,
    });
  } catch (error) {
    console.error("Error saving payroll cycle:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to save payroll cycle",
    });
  }
}

/**
 * Record an advance or extra payment (advance or bonus) taken by the employee
 */
export async function recordExtraPayment(req, res) {
  try {
    const { instructorId, month, amount, type = "ADVANCE", note = "", paymentMode = "Cash", takenAt } = req.body;

    if (!instructorId || !amount) {
      return res.status(400).json({
        status: false,
        message: "instructorId and amount are required",
      });
    }

    const today = new Date();
    const targetMonth = month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const [yearStr, monthStr] = targetMonth.split("-");
    const monthStart = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1, 0, 0, 0, 0);

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      return res.status(404).json({
        status: false,
        message: "Employee not found",
      });
    }

    // Find or create PaymentCycle for this month
    let cycle = await prisma.paymentCycle.findFirst({
      where: {
        instructorId,
        month: monthStart,
      },
    });

    const paymentAmount = Math.round(Number(amount));
    const isBonus = type === "BONUS";
    const modeLabel = paymentMode ? `[${paymentMode}] ` : "";
    const fullNote = `${modeLabel}${note || (isBonus ? "Extra Bonus / Incentive" : "Salary Advance")}`;

    if (!cycle) {
      const baseSalary = Math.round(Number(instructor.payment) || 0);
      const amountTaken = isBonus ? 0 : paymentAmount;
      const bonus = isBonus ? paymentAmount : 0;
      const netAmount = Math.max(0, baseSalary - amountTaken + bonus);

      cycle = await prisma.paymentCycle.create({
        data: {
          instructorId,
          month: monthStart,
          baseAmount: baseSalary,
          deductions: 0,
          bonus,
          amountTaken,
          netAmount,
          status: "PENDING",
          paidAt: new Date(),
          note: fullNote,
        },
      });
    } else {
      let newAmountTaken = cycle.amountTaken || 0;
      let newBonus = cycle.bonus || 0;

      if (isBonus) {
        newBonus += paymentAmount;
      } else {
        newAmountTaken += paymentAmount;
      }

      const newNet = Math.max(0, cycle.baseAmount - cycle.deductions - newAmountTaken + newBonus);
      cycle = await prisma.paymentCycle.update({
        where: { id: cycle.id },
        data: {
          amountTaken: newAmountTaken,
          bonus: newBonus,
          netAmount: newNet,
          note: cycle.note ? `${cycle.note} | ${fullNote}` : fullNote,
        },
      });
    }

    // Create PaymentTaken record for advances
    let paymentTaken = null;
    if (!isBonus) {
      paymentTaken = await prisma.paymentTaken.create({
        data: {
          paymentCycleId: cycle.id,
          amount: paymentAmount,
          note: fullNote,
          takenAt: takenAt ? new Date(takenAt) : new Date(),
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: `${isBonus ? "Extra bonus" : "Salary advance"} of ₹${paymentAmount} recorded successfully`,
      data: {
        cycle,
        paymentTaken,
      },
    });
  } catch (error) {
    console.error("Error recording extra payment:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to record payment",
    });
  }
}

export const recordAdvancePayment = recordExtraPayment;
