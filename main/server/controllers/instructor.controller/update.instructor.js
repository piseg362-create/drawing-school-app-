import prisma from "../../config/database.js";

export async function updateInstructor(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const updated = await prisma.instructor.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        Assigned_car: data.Assigned_car,
        payment: data.payment,
        status: data.status,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      }
    });

    return res.status(200).json({ success: true, message: "Instructor updated successfully", data: updated });
  } catch (error) {
    console.error("Update Instructor Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
