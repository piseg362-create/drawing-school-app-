"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../component/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../component/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const PREDEFINED_PACKAGES = [
  { name: "Basic Two-Wheeler", price: 2500, duration: 15 },
  { name: "Standard Four-Wheeler (Manual)", price: 4500, duration: 21 },
  { name: "Standard Four-Wheeler (Automatic)", price: 5000, duration: 21 },
  { name: "Refresher Course (Four-Wheeler)", price: 2000, duration: 7 },
  { name: "Comprehensive (Two + Four Wheeler)", price: 6500, duration: 30 },
];

export function PackagesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: 1,
  });

  const [maxPriceLimit, setMaxPriceLimit] = useState(5000);
  const [packageSelection, setPackageSelection] = useState("");
  const [isCustomPackage, setIsCustomPackage] = useState(false);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const res = await fetchApi("/support-data");
      const data = await res.json();
      return data?.data?.existingPackage || [];
    },
  });

  const addPackageMutation = useMutation({
    mutationFn: async (newPackage) => {
      const res = await fetchApi("/package-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPackage),
      });
      if (!res.ok) {
        throw new Error(res.message || "Failed to create package");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Package created successfully");
      handleOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (error) => {
      console.error("Failed to save package:", error);
      toast.error(error.message || "An unexpected error occurred.");
    },
  });

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setFormData({ name: "", price: 0, duration: 1 });
      setPackageSelection("");
      setIsCustomPackage(false);
      setMaxPriceLimit(5000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePackageSelect = (value) => {
    setPackageSelection(value);
    if (value === "Other") {
      setIsCustomPackage(true);
      setFormData({ name: "", price: 0, duration: 1 });
      setMaxPriceLimit(5000);
    } else {
      setIsCustomPackage(false);
      const selected = PREDEFINED_PACKAGES.find((pkg) => pkg.name === value);
      if (selected) {
        let newMax = 5000;
        while (selected.price >= newMax) {
          newMax *= 2;
        }
        setMaxPriceLimit(newMax);
        setFormData({
          name: selected.name,
          price: selected.price,
          duration: selected.duration,
        });
      }
    }
  };

  const handlePriceChange = (value) => {
    const newPrice = value[0];
    if (newPrice >= maxPriceLimit) {
      setMaxPriceLimit((prevMax) => prevMax * 2);
    }
    setFormData((prev) => ({ ...prev, price: newPrice }));
  };

  const handleDurationChange = (value) => {
    setFormData((prev) => ({ ...prev, duration: value[0] }));
  };

  const handleSavePackage = () => {
    if (!formData.name) {
      toast.error("Package name is required");
      return;
    }
    addPackageMutation.mutate(formData);
  };

  const activePackagesCount = packages.filter((p) => p.isActive !== false).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#8a8d96] mb-1">{t("Active Packages")}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">{activePackagesCount}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-[#171a22] rounded-full flex items-center justify-center text-blue-600 dark:text-[#5c6e99]">
            <span className="text-xl">📦</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e222d] rounded-xl shadow-sm border border-gray-200 dark:border-[#2c3242] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-[#2c3242] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de]">{t("Package Catalog")}</h2>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-[#c1552c] hover:bg-[#a84a26] text-white">
                + Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#1e222d] border-gray-200 dark:border-[#2c3242]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-[#f2e9de]">{t("Add New Package")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2 relative z-50">
                  <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                    Select Package Type
                  </label>
                  <Select onValueChange={handlePackageSelect} value={packageSelection}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a standard package" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="flex flex-col">
                        {PREDEFINED_PACKAGES.map((pkg) => (
                          <SelectItem key={pkg.name} value={pkg.name}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="Other"
                          className="font-medium border-t border-gray-200 dark:border-[#2c3242] mt-1 pt-2"
                        >
                          Other (Create custom package)
                        </SelectItem>
                      </div>
                    </SelectContent>
                  </Select>

                  {isCustomPackage && (
                    <div className="pt-2">
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Type custom package name..."
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#3a3d45] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] focus:ring-[#c1552c]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">Price</label>
                    <span className="text-[#c1552c] font-bold text-lg">
                      ₹ {formData.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Slider
                    value={[formData.price]}
                    min={0}
                    max={maxPriceLimit}
                    step={5}
                    onValueChange={handlePriceChange}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>₹ 0</span>
                    <span>₹ {maxPriceLimit.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                      Duration (Days)
                    </label>
                    <span className="text-[#c1552c] font-bold text-lg">
                      {formData.duration} {formData.duration === 1 ? "Day" : "Days"}
                    </span>
                  </div>
                  <Slider
                    value={[formData.duration]}
                    min={1}
                    max={31}
                    step={1}
                    onValueChange={handleDurationChange}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>1 Day</span>
                    <span>31 Days</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSavePackage}
                    className="w-full bg-[#c1552c] hover:bg-[#a84a26] text-white"
                    disabled={!formData.name || addPackageMutation.isLoading}
                  >
                    Save Package
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-[#171a22]/50">
              <TableRow className="border-gray-200 dark:border-[#2c3242]">
                <TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Package Info")}</TableHead>
                <TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Price")}</TableHead>
                <TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Duration (Days)")}</TableHead>
                <TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-[#8a8d96]">
                    Loading packages...
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-[#8a8d96]">
                    No packages found. Add your first package above.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow
                    key={pkg.id}
                    className="border-gray-100 dark:border-[#2c3242] hover:bg-gray-50 dark:hover:bg-[#232734] transition-colors"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-[#f2e9de]">
                      {pkg.name}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-[#cfd3da]">
                      ₹ {pkg.price}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-[#cfd3da]">
                      {pkg.duration} Days
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pkg.isActive !== false
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {pkg.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
