import prisma from "../../config/database.js";
import crypto from "crypto";

export async function createRazorpayOrder(req, res) {
  try {
    let Razorpay;
    try {
      // Dynamic import so the server doesn't crash if npm install wasn't run yet
      const rzpModule = await import("razorpay");
      Razorpay = rzpModule.default || rzpModule;
    } catch (e) {
      return res.status(500).json({ 
        success: false, 
        message: "Razorpay SDK not installed. Please run 'npm install razorpay' in your terminal." 
      });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || "rzp_live_TjivMCRAk7MwAv";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "E86e18zTbrJKGur9lSdIB1GC";

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: 1 * 100, // 1 INR in paise (for production testing)
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await instance.orders.create(options);

    return res.status(200).json({
      success: true,
      order,
      key_id, // send public key to frontend
    });
  } catch (error) {
    console.error("Error creating order:", error);
    const errorMessage = error?.error?.description || error?.description || error?.message || "Failed to create Razorpay order";
    return res.status(500).json({ success: false, message: errorMessage });
  }
}

export async function processLicensePayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, simulate } = req.body;
    
    // Fallback for simulation mode before actual keys are provided
    if (simulate) {
      let demo = await prisma.demoStatus.findFirst({});
      if (demo) {
        await prisma.demoStatus.update({
          where: { id: demo.id },
          data: { isDemo: false }
        });
      }
      return res.status(200).json({
        success: true,
        message: "Payment simulated successfully. License activated.",
      });
    }

    // Actual Signature Verification
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment parameters." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "E86e18zTbrJKGur9lSdIB1GC";
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature. Payment verification failed." });
    }

    // Payment is verified! Unlock the demo.
    let demo = await prisma.demoStatus.findFirst({});
    if (demo) {
      await prisma.demoStatus.update({
        where: { id: demo.id },
        data: { isDemo: false }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment successful. License activated for this PC.",
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    const errorMessage = error?.error?.description || error?.description || error?.message || "Internal server error during payment processing";
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}
