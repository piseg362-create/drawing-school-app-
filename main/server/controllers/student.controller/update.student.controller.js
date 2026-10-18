import prisma from "../../config/database.js";

export async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const updated = await prisma.student.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        Assigned_Instructor: data.Assigned_Instructor,
        Assigned_car_id: data.Assigned_car_id,
        Enrollment_status: data.Enrollment_status,
        Course_Start_date: data.Course_Start_date ? new Date(data.Course_Start_date) : undefined,
        Total_amount: data.Total_amount,
        Amount_paid: data.Amount_paid,
        address: data.address
      }
    });

    // If student course is marked Completed, expedite course completion message immediately
    if (data.Enrollment_status && data.Enrollment_status.toLowerCase() === "completed") {
      try {
        const studentMobile = updated.mobile?.length === 10 ? "91" + updated.mobile : updated.mobile;
        const completionTemplates = await prisma.whatsAppTemplate.findMany({
          where: { name: "completion" }
        });
        const templateIds = completionTemplates.map(t => t.id);
        
        if (templateIds.length > 0 && studentMobile) {
          await prisma.messageQueue.updateMany({
            where: {
              templateId: { in: templateIds },
              recipient: studentMobile,
              status: "PENDING"
            },
            data: { scheduledAt: new Date() }
          });
        }
      } catch (msgErr) {
        console.warn("Notice: could not expedite completion message on student status change:", msgErr.message);
      }
    }

    return res.status(200).json({ success: true, message: "Student updated successfully", data: updated });
  } catch (error) {
    console.error("Update Student Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
