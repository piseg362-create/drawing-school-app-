import prisma from "../../config/database.js";

export async function createInstructor(req, res) {
  // 1. Only allow POST requests (optional, but good practice if using Next.js Pages router)

  try {
    const {
      name,
      mobile,
      licenseNumber,
      jobType,
      joiningDate,
      payment,
      paymentDate,
      Assigned_car_id,
      systemId,
    } = req.body;

    // Basic validation
    if (
      !name ||
      !mobile ||
      !licenseNumber ||
      !joiningDate ||
      !payment ||
      !paymentDate ||
      !Assigned_car_id
    ) {
      return res.status(400).json({
        status: false,
        message: "Missing required input values",
      });
    }

    // Check if instructor already exists
    const isUserExist = await prisma.instructor.findFirst({
      where: {
        mobile,
      },
    });

    if (isUserExist) {
      return res.status(409).json({
        status: false,
        message: "Instructor already exists in this system",
      });
    }

    // Create the Instructor
    let result = await prisma.instructor.create({
      data: {
        name,
        mobile,
        licenseNumber,
        joiningDate: new Date(joiningDate), // Convert string to DateTime
        payment: Number(payment), // Ensure this is a number
        paymentDate: Number(paymentDate), // Convert the "1-31" Shadcn string to a number
        assignedCarId: Assigned_car_id,
      },
    });

    return res.status(201).json({
      status: true,
      message: "Instructor created successfully",
      data: result,
    });
  } catch (error) {
    // 3. Catch block implementation
    console.error("Error creating instructor:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message || "Something went wrong",
    });
  }
}
