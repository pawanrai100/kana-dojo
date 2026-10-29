"use client";

import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// shown once after signing in on a device that has guest progress
export function GuestImportDialog({
  answers,
  onImport,
  onKeepSeparate,
}: {
  answers: number | null;
  onImport: () => void;
  onKeepSeparate: () => void;
}) {
  return (
    <Dialog open={answers !== null} onOpenChange={(o) => !o && onKeepSeparate()}>
      <DialogContent>
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CloudUpload className="size-6" />
        </div>
        <DialogTitle>Add your guest progress to this account?</DialogTitle>
        <DialogDescription className="mt-2">
          This device has {answers} answer{answers === 1 ? "" : "s"} of practice from before you signed in. Adding it
          keeps your streak, belt, Tower progress and character mastery, and syncs it to your other devices.
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onKeepSeparate}>
            Keep it separate
          </Button>
          <Button onClick={onImport}>Add to my account</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
