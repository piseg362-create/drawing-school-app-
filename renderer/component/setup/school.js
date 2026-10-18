import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";


const School = ({ onComplete }) => {
  // 1. Define the state for all form fields
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    mobile: "",
    email: "",
    workingStartTime: "09:00",
    workingEndTime: "19:00",
  });

  // Load initial data from local storage (user object)
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setFormData((prevData) => ({
          ...prevData,
          name: user.businessName || prevData.name,
          mobile: user.mobileNumber || prevData.mobile,
        }));
      }
    } catch (error) {
      console.error("Error reading user data from local storage", error);
    }
  }, []);

  // 2. Handle input changes dynamically
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting School Data:", formData);

    try {
      let systemID = undefined;
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        systemID = user.systemUserId || user.systemId || user.userId || user._id || user.id;
      }

      const payload = {
        ...formData,
        ...(systemID && { systemID })
      };

      // Passing the method, headers, and body as the second argument
      const fetchData = await fetchApi("/school-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Assuming fetchApi returns a standard fetch Response object
      const result = await fetchData.json();
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting school data:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="school-name"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          School Name
        </Label>
        <Input
          id="school-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Springfield Driving School"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="school-email"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Email Address
        </Label>
        <Input
          id="school-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="contact@school.com"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="school-mobile"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Phone mobile
        </Label>
        <Input
          id="school-mobile"
          name="mobile"
          type="tel"
          value={formData.mobile}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="school-address"
          className="text-gray-900 dark:text-[#f2e9de]"
        >
          Full Address
        </Label>
        <Input
          id="school-address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main St, City, State, Zip"
          required
          className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242] text-gray-900 dark:text-[#f2e9de] focus-visible:ring-[#c1552c] placeholder:text-gray-400 dark:placeholder:text-[#5a5f6e]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="school-start-time" className="text-gray-900 dark:text-[#f2e9de]">
            Work Start Time
          </Label>
          <Input
            id="school-start-time"
            name="workingStartTime"
            type="time"
            value={formData.workingStartTime}
            onChange={handleChange}
            className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="school-end-time" className="text-gray-900 dark:text-[#f2e9de]">
            Work Closing Time
          </Label>
          <Input
            id="school-end-time"
            name="workingEndTime"
            type="time"
            value={formData.workingEndTime}
            onChange={handleChange}
            className="bg-white dark:bg-[#171a22] border border-gray-300 dark:border-[#2c3242]"
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        
        <Button
          type="submit"
          className="flex-1 bg-[#c1552c] text-white hover:bg-[#a84a26]"
        >
          Save School Details
        </Button>
      </div>
    </form>
  );
};

export default School;