import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";


const Instructor = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    licenseNumber: "",
    jobType: "instructor", // Set default match to lowercase like the clickable divs
    joiningDate: "",
    payment: "",
    paymentDate: "",
    status: "Available",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Custom handler for the clickable divs
  const handleJobTypeSelect = (type) => {
    setFormData((prevData) => ({
      ...prevData,
      jobType: type,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting Instructor Data:", formData);

    try {
      const fetchData = await fetchApi("/instructor-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await fetchData.json();
      console.log("Success:", result);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting Instructor data:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="Instructor-name"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Instructor Name
        </Label>
        <Input
          id="Instructor-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Springfield Driving Instructor"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="Instructor-email"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          License Number
        </Label>
        <Input
          id="Instructor-email"
          name="licenseNumber"
          value={formData.licenseNumber}
          onChange={handleChange}
          placeholder="DL-1420230012345"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="Instructor-mobile"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Phone mobile
        </Label>
        <Input
          id="Instructor-mobile"
          name="mobile"
          type="tel"
          value={formData.mobile}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      {/* Clickable Divs for Job Type */}
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-[#f2e9de]">Job Type</Label>
        <div className="flex gap-4">
          <div
            onClick={() => handleJobTypeSelect("instructor")}
            className={`flex-1 cursor-pointer rounded-md border px-4 py-3 text-center transition-all ${
              formData.jobType === "instructor"
                ? "border-[#c1552c] bg-[#c1552c]/10 text-[#c1552c] ring-1 ring-[#c1552c]"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#2c3242] dark:bg-[#171a22] dark:text-[#f2e9de] dark:hover:bg-[#1c202a]"
            }`}
          >
            <span className="font-medium text-sm">Instructor</span>
          </div>

          <div
            onClick={() => handleJobTypeSelect("reception")}
            className={`flex-1 cursor-pointer rounded-md border px-4 py-3 text-center transition-all ${
              formData.jobType === "reception"
                ? "border-[#c1552c] bg-[#c1552c]/10 text-[#c1552c] ring-1 ring-[#c1552c]"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#2c3242] dark:bg-[#171a22] dark:text-[#f2e9de] dark:hover:bg-[#1c202a]"
            }`}
          >
            <span className="font-medium text-sm">RECEPTION</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="Instructor-joiningDate" className="text-gray-900 dark:text-[#f2e9de]">Joining Date</Label>
        <Input
          id="Instructor-joiningDate"
          name="joiningDate"
          type="date"
          value={formData.joiningDate}
          onChange={handleChange}
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="Instructor-payment" className="text-gray-900 dark:text-[#f2e9de]">Payment Amount</Label>
        <Input
          id="Instructor-payment"
          name="payment"
          type="number"
          value={formData.payment}
          onChange={handleChange}
          placeholder="5000"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="Instructor-paymentDate" className="text-gray-900 dark:text-[#f2e9de]">Payment Date</Label>
        <Input
          id="Instructor-paymentDate"
          name="paymentDate"
          type="date"
          value={formData.paymentDate}
          onChange={handleChange}
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c]"
        />
      </div>

      <div className="pt-4 flex gap-3">
        
        <Button
          type="submit"
          className="flex-1 bg-[#c1552c] text-white hover:bg-[#a84a26]"
        >
          Save Instructor Details
        </Button>
      </div>
    </form>
  );
};

export default Instructor;
