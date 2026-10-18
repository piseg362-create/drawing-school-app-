import prisma, { als } from "../../config/database.js";

export async function createCar(req, res) {
  try {
    const { name, transmission, car_Number, car_year, maintenanceTypes } = req.body;

    if (!name || !transmission || !car_Number || !car_year) {
      return res.status(400).json({
        status: false,
        message: "Missing required input values",
      });
    }

    const currentTenantId = als.getStore() || req.headers['x-system-id'] || null;

    const isCarExist = await prisma.car.findFirst({
      where: {
        car_Number,
      },
    });

    if (isCarExist) {
      return res.status(409).json({
        status: false,
        message: "Car with this number already exists",
      });
    }

    const carData = {
      name,
      transmission,
      car_Number,
      car_year,
      systemID: currentTenantId,
    };

    if (maintenanceTypes && maintenanceTypes.length > 0) {
      carData.maintenanceSchedules = {
        create: {
          serviceDate: new Date(), // Defaulting to today
          systemID: currentTenantId,
          items: {
            create: maintenanceTypes.map((item) => ({
              type: item.type,
              intervalDays: item.intervalDays ? parseInt(item.intervalDays, 10) : null,
              systemID: currentTenantId,
            }))
          }
        }
      };
    }

    const result = await prisma.car.create({
      data: carData,
    });

    return res.status(201).json({
      status: true,
      message: "Car created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating car:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message || "Something went wrong",
    });
  }
}
