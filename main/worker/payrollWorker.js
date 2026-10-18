import prisma, { als } from "../server/config/database.js";

export function initPayrollWorker() {
  console.log("💰 Payroll Worker Initialized. Checking for due payments...");
  
  // Run check immediately on startup
  checkAndGeneratePayroll();

  // Then run every 6 hours
  setInterval(checkAndGeneratePayroll, 6 * 60 * 60 * 1000);
}

async function checkAndGeneratePayroll() {
  als.run('__BYPASS_TENANT__', async () => {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      
      // Normalize current month to the 1st day of the month at 00:00:00 for uniqueness check
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get all active instructors
      const instructors = await prisma.instructor.findMany({
        where: { isActive: true }
      });

      for (const instructor of instructors) {
        // If they have a paymentDate, and today is on or after that date
        if (instructor.paymentDate && currentDay >= instructor.paymentDate) {
          
          // Check if a payment cycle for THIS exact month already exists
          const existingCycle = await prisma.paymentCycle.findFirst({
            where: {
              instructorId: instructor.id,
              month: currentMonthStart
            }
          });

          // If it doesn't exist, generate it!
          if (!existingCycle) {
            console.log(`Generating automatic payroll for instructor ${instructor.name} (Due: ${instructor.paymentDate}th)`);

            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            // Fetch attendance for this month to calculate salary as per days present
            const attendances = await prisma.attendance.findMany({
              where: {
                instructorId: instructor.id,
                date: {
                  gte: currentMonthStart,
                  lte: currentMonthEnd,
                },
              },
            });

            let presentDays = 0;
            let halfDays = 0;
            let absentDays = 0;
            let leaveDays = 0;

            attendances.forEach((att) => {
              if (att.status === "PRESENT") presentDays++;
              else if (att.status === "HALF_DAY") halfDays++;
              else if (att.status === "ABSENT") absentDays++;
              else if (att.status === "LEAVE") leaveDays++;
            });

            const baseAmount = instructor.payment || 0;
            let earnedSalary = baseAmount;
            let lossOfPay = 0;
            let payrollNote = `Auto-generated payroll for ${currentMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

            // If attendance was logged for this instructor, calculate earned salary as per days present
            if (attendances.length > 0) {
              const effectiveDays = presentDays + halfDays * 0.5;
              const dailyRate = daysInMonth > 0 ? baseAmount / daysInMonth : 0;
              earnedSalary = Math.round(effectiveDays * dailyRate);
              lossOfPay = Math.max(0, baseAmount - earnedSalary);
              payrollNote = `Auto payroll (${presentDays} Present, ${halfDays} Half Day, ${absentDays} Absent)`;
            }

            // Calculate total advances (amountTaken) from PaymentTaken this month
            const advances = await prisma.paymentTaken.aggregate({
              where: {
                paymentCycle: { instructorId: instructor.id },
                takenAt: { gte: currentMonthStart },
              },
              _sum: { amount: true },
            });

            const totalAdvances = advances._sum.amount || 0;
            const netAmount = Math.max(0, earnedSalary - totalAdvances);
            
            await prisma.paymentCycle.create({
              data: {
                instructorId: instructor.id,
                month: currentMonthStart,
                baseAmount: baseAmount,
                amountTaken: totalAdvances,
                deductions: lossOfPay,
                bonus: 0,
                netAmount: netAmount,
                paidAt: new Date(), // They can update this when they actually pay
                status: "PENDING",
                note: payrollNote,
                systemID: instructor.systemID || null,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in Payroll Worker:", error);
    }
  });
}
