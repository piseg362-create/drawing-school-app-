import prisma, { als } from "../../config/database.js";

export async function createStudent(req, res) {
  try {
    console.log(req.body);

    const {
      name,
      mobile,
      packageId,
      package_name,
      instructorId,
      Amount_paid,
      Assigned_car_id,
      startDate,
      batch_time,
      reminderDate,
      systemId,
    } = req.body;

    const currentTenantId = als.getStore() || req.headers['x-system-id'] || systemId || null;

    // Basic validation
    if (
      !name ||
      !mobile ||
      !packageId ||
      !package_name ||
      !instructorId ||
      Amount_paid === undefined ||
      !startDate
    ) {
      return res.status(400).json({
        status: false,
        message: "Missing required input values",
      });
    }

    // Check if student already exists
    const isUserExist = await prisma.student.findFirst({
      where: {
        mobile,
      },
    });

    if (isUserExist) {
      return res.status(409).json({
        status: false,
        message: "User already exists in this system",
      });
    }

    // Find package
    const findPackage = await prisma.package.findFirst({
      where: {
        id: packageId,
      },
    });

    if (!findPackage) {
      return res.status(404).json({
        status: false,
        message: "Package not found",
      });
    }

    // Package price & Amount paid
    const packagePrice = Number(findPackage.price);
    const amountPaid = Number(Amount_paid);

    // Validate payment
    if (isNaN(amountPaid) || amountPaid < 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid Amount_paid",
      });
    }

    if (amountPaid > packagePrice) {
      return res.status(400).json({
        status: false,
        message: "Amount paid cannot be greater than package price",
      });
    }

    // Remaining payment and percentage
    const payment_remaining = packagePrice - amountPaid;
    const payment_percentage =
      packagePrice > 0 ? (payment_remaining / packagePrice) * 100 : 0;

    // Course start date
    const Course_Start_date = new Date(startDate);

    // Validate date
    if (isNaN(Course_Start_date.getTime())) {
      return res.status(400).json({
        status: false,
        message: "Invalid startDate",
      });
    }


    // Course end date
    const Course_End_Date = new Date(Course_Start_date);
    Course_End_Date.setDate(
      Course_End_Date.getDate() + Number(findPackage.duration)
    );

    // Fetch Instructor to get the name for the WhatsApp template
    let instructorName = "Assigned Instructor";
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      if (instructor && instructor.name) {
        instructorName = instructor.name;
      }
    }
    
    // Fetch School SetUp to get the school name and settings
    let schoolName = "Driving School";
    let reminderDays = 10;
    let enableOnboardingMsg = true;
    let enableReminderMsg = true;
    let enableCompletionMsg = true;
    const schoolSetup = await prisma.schoolSetUp.findFirst();
    if (schoolSetup) {
      if (schoolSetup.school_name) schoolName = schoolSetup.school_name;
      if (schoolSetup.reminderDays !== undefined) reminderDays = schoolSetup.reminderDays;
      if (schoolSetup.enableOnboardingMsg !== undefined) enableOnboardingMsg = schoolSetup.enableOnboardingMsg;
      if (schoolSetup.enableReminderMsg !== undefined) enableReminderMsg = schoolSetup.enableReminderMsg;
      if (schoolSetup.enableCompletionMsg !== undefined) enableCompletionMsg = schoolSetup.enableCompletionMsg;
    }

    // Automatically calculate reminderDate using reminderDays from Course_Start_date
    const calculatedReminderDate = new Date(Course_Start_date);
    calculatedReminderDate.setDate(calculatedReminderDate.getDate() + reminderDays);


    // Create everything in ONE transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create student
      const student = await tx.student.create({
        data: {
          name,
          mobile,
          packageId,
          package_name,
          
          Assigned_Instructor: instructorId || null,
          Assigned_car_id: Assigned_car_id || null,
          
          Total_amount: packagePrice,
          Amount_paid: amountPaid,
          
          Remaining_percentage: Number(payment_percentage),
          remaining_amount: Number(payment_remaining),
          
          Course_Start_date,
          Course_End_Date,
          reminderDate: calculatedReminderDate,
          systemID: currentTenantId,
        },
      });

      // 2. Create schedule
      const schedule = await tx.schedule.create({
        data: {
          student_id: student.id,
          Batch_time: batch_time,
          Duration_time: "1h",
          Car_id: Assigned_car_id,
          systemID: currentTenantId,
        },
      });

      const tokenRecord = await tx.whatsAppToken.findFirst();
      const preferredLanguage = tokenRecord?.defaultLanguage || req.body.whatsappLanguage || req.body.language || "mr";

      // 3. Find WhatsApp template (Approved Onboarding)
      let template = await tx.whatsAppTemplate.findFirst({
        where: {
          name: "onboarding",
          language: preferredLanguage,
        },
      });

      if (!template) {
        template = await tx.whatsAppTemplate.findFirst({
          where: { name: "onboarding", language: "en" }
        }) || await tx.whatsAppTemplate.findFirst({
          where: { name: "onboarding" }
        });
      }

      // 4. If template doesn't exist, create it locally for DB reference
      if (!template) {
        template = await tx.whatsAppTemplate.create({
          data: {
            name: "onboarding",
            templateId: "onboarding",
            language: preferredLanguage,
            category: "UTILITY",
            status: "APPROVED",
            body: "🎉 Welcome to {{1}}!\n\nHello {{2}}, your driving course enrollment has been successfully completed. 🚗\n\n📅 Course Start Date: {{3}}\n👨🏫 Instructor: {{4}}\n💰 Amount Paid: ₹{{5}}\n💳 Remaining Amount: ₹{{6}}\n\nWe’re happy to have you with us. Please be ready for your first driving session on the scheduled date.\n\nIf you have any questions, feel free to contact us.\n\nThank you for choosing {{7}}! 🙏",
            variables: [],
          },
        });
      }

      // 5. Add WhatsApp message to queue with exact positional variables
      const formattedDate = Course_Start_date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 12 Oct 2026
      

      // Ensure the mobile number has the country code for WhatsApp (default to 91 for India if exactly 10 digits)
      let formattedMobile = mobile;
      if (formattedMobile.length === 10) {
        formattedMobile = "91" + formattedMobile;
      }
      
      if (enableOnboardingMsg) {
        await tx.messageQueue.create({
          data: {
            templateId: template.id,
            recipient: formattedMobile,
            systemID: currentTenantId,
            variables: {
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: schoolName },
                    { type: "text", text: name },
                    { type: "text", text: formattedDate },
                    { type: "text", text: instructorName },
                    { type: "text", text: amountPaid.toString() },
                    { type: "text", text: payment_remaining.toString() },
                    { type: "text", text: schoolName },
                  ]
                }
              ]
            },
            status: "PENDING",
            scheduledAt: new Date(),
          },
        });
      }

      // 6. Schedule Reminder Message automatically
      if (calculatedReminderDate && enableReminderMsg) {
        let reminderTemplate = await tx.whatsAppTemplate.findFirst({
          where: { name: "reminder", language: preferredLanguage },
        });

        if (!reminderTemplate) {
          reminderTemplate = await tx.whatsAppTemplate.findFirst({
            where: { name: "reminder", language: "en" }
          }) || await tx.whatsAppTemplate.findFirst({
            where: { name: "reminder" }
          });
        }

        if (!reminderTemplate) {
          reminderTemplate = await tx.whatsAppTemplate.create({
            data: {
              name: "reminder",
              templateId: "reminder",
              language: preferredLanguage,
              category: "UTILITY",
              status: "APPROVED",
              body: "Hello {{1}},\n\nThis is a friendly reminder from {{2}} regarding your pending payment.\n\n💰 Total Amount: ₹{{3}}\n✅ Amount Paid: ₹{{4}}\n⏳ Pending Amount: ₹{{5}}\n📅 Payment Due Date: {{6}}\n\nPlease complete the pending payment by the due date to continue your driving course without interruption.\n\nIf you have already made the payment, please ignore this message.\n\nThank you,\nThe {{2}} Team.",
              variables: [],
              systemID: currentTenantId,
            },
          });
        }

        const formattedRemDate = calculatedReminderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        await tx.messageQueue.create({
          data: {
            templateId: reminderTemplate.id,
            recipient: formattedMobile,
            systemID: currentTenantId,
            variables: {
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: name },
                    { type: "text", text: schoolName },
                    { type: "text", text: packagePrice.toString() },
                    { type: "text", text: amountPaid.toString() },
                    { type: "text", text: payment_remaining.toString() },
                    { type: "text", text: formattedRemDate },
                  ]
                }
              ]
            },
            status: "PENDING",
            scheduledAt: calculatedReminderDate, // Uses Global Payment Reminder Delay (Days)
          },
        });
      }

      // 7. Schedule Course Completion Message
      if (enableCompletionMsg) {
        let completionTemplate = await tx.whatsAppTemplate.findFirst({
          where: { name: "completion", language: preferredLanguage },
        });

        if (!completionTemplate) {
          completionTemplate = await tx.whatsAppTemplate.findFirst({
            where: { name: "completion", language: "en" }
          }) || await tx.whatsAppTemplate.findFirst({
            where: { name: "completion" }
          });
        }

        if (!completionTemplate) {
          completionTemplate = await tx.whatsAppTemplate.create({
            data: {
              name: "completion",
              templateId: "completion",
              language: preferredLanguage,
              category: "UTILITY",
              status: "APPROVED",
              body: "Hello {{1}},\n\n🎉 Congratulations on completing your driving course with {{2}}!\n\nThis is a reminder that your course has been completed, but an outstanding payment of ₹{{3}} is still pending.\n\nPlease clear the remaining amount at your earliest convenience.\n\nThank you for choosing {{2}}. We wish you safe and confident driving! 🚗\n\nThe {{2}} Team.",
              variables: [],
              systemID: currentTenantId,
            },
          });
        }

        await tx.messageQueue.create({
          data: {
            templateId: completionTemplate.id,
            recipient: formattedMobile,
            systemID: currentTenantId,
            variables: {
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: name },
                    { type: "text", text: schoolName },
                    { type: "text", text: payment_remaining.toString() },
                  ]
                }
              ]
            },
            status: "PENDING",
            scheduledAt: Course_End_Date, // Scheduled to send when student completes course
          },
        });
      }

      return {
        student,
        schedule,
      };
    });

    return res.status(201).json({
      status: true,
      message: "Student created successfully",
      data: result.student,
      schedule: result.schedule,
    });
    
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Something went wrong",
    });
  }
}