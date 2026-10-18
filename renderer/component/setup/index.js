"use client";

import { react, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import School from "./school";
import Instructor from "./instructor";
import Car from "./car";
import Package from "./package";
import { CarLoaderCompact } from "../../../component/loader/CarLoader";

const Index = () => {
  const [isCompleted, setIsCompleted] = useState(true);
  const [checkList, setCheckList] = useState({});
  const [open, setOpen] = useState(false);

  const getProgress = () => {
    if (!checkList) return 0;
    if (!checkList.schoolSetup) return 0;
    if (!checkList.instructorSetup) return 33;
    if (!checkList.carSetup) return 66;
    if (!checkList.packageSetup) return 100;
    return 100;
  };

  useEffect(() => {
    async function checkStatus() {
      const userStr = localStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : null;
      const sysId = userObj?.systemUserId || userObj?.systemId || userObj?.id || "default";
      const storageKey = `isSetupCompleted_${sysId}`;

      // 1. Check local storage first to avoid unnecessary API calls
      const localSetupStatus = localStorage.getItem(storageKey);
      if (localSetupStatus === "true") {
        setIsCompleted(true);
        setOpen(false);
        return;
      }

      // 2. If not complete in local storage, fetch from API
      try {
        const { fetchApi } = await import("../../lib/api");
        const response = await fetchApi("/setup-check");
        const data = await response.json();

        const checklist = data.checklist || {};

        setCheckList(checklist);
        setIsCompleted(data.setupComplete);

        // Verify that every single property inside the checklist is explicitly true
        const areAllStepsTrue = Object.values(checklist).every(
          (step) => step === true,
        );

        // 3. Save to local storage ONLY if setupComplete is true AND no checklist data is false
        if (data.setupComplete && areAllStepsTrue) {
          localStorage.setItem(storageKey, "true");
          setOpen(false);
        } else {
          // Ensure local storage is cleared if anything is false (prevents stale true states)
          localStorage.removeItem(storageKey);
          localStorage.removeItem("isSetupCompleted");
          setOpen(true);
        }
      } catch (error) {
        console.error("Failed to check status:", error);
      }
    }

    checkStatus();
  }, []);
  const handleStepComplete = (stepName) => {
    setCheckList((prev) => ({
      ...prev,
      [stepName]: true,
    }));
  };

  const renderSetupStep = () => {
    if (!checkList) return null;

    // 2. Pass the callback function to the child components as a prop
    if (!checkList.schoolSetup)
      return <School onComplete={() => handleStepComplete("schoolSetup")} />;
    if (!checkList.instructorSetup)
      return (
        <Instructor onComplete={() => handleStepComplete("instructorSetup")} />
      );
    if (!checkList.carSetup)
      return <Car onComplete={() => handleStepComplete("carSetup")} />;
    if (!checkList.packageSetup)
      return <Package onComplete={() => handleStepComplete("packageSetup")} />;

    return <div className="p-4 text-center">All setup steps complete!</div>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="backdrop-blur-md bg-black/40" />
        <DialogContent className="max-w-[80vw]! w-[80vw]! max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-[#f2e9de]">
              Set up
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-[#a8967b]">
              Make changes to your profile here.
            </DialogDescription>
            
            {/* Progress Bar with Car */}
            <div className="w-full py-4 pb-2">
              <div className="relative pt-12">
                <div 
                  className="absolute top-2 transition-all duration-500 ease-in-out z-10" 
                  style={{ left: `calc(${getProgress()}% - 30px)` }}
                >
                  <CarLoaderCompact size={60} />
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-[#2c3242] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#c1552c] transition-all duration-500 ease-in-out"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-[#a8967b] mt-2">
                <span>School</span>
                <span>Instructor</span>
                <span>Cars</span>
                <span>Packages</span>
              </div>
            </div>
          </DialogHeader>

          {renderSetupStep()}
          {checkList.packageSetup && (
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-gray-300 dark:border-[#2c3242] text-gray-700 dark:text-[#a8967b] hover:bg-gray-50 dark:hover:bg-[#232734]"
                >
                  Cancel
                </Button>
              </DialogClose>

              <Button
                onClick={() => {
                  const userStr = localStorage.getItem("user");
                  const userObj = userStr ? JSON.parse(userStr) : null;
                  const sysId = userObj?.systemUserId || userObj?.systemId || userObj?.id || "default";
                  localStorage.setItem(`isSetupCompleted_${sysId}`, "true");
                  setIsCompleted(true);
                  setOpen(false);
                }}
                className="bg-[#c1552c] text-white hover:bg-[#a84a26]"
              >
                Save changes
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;
