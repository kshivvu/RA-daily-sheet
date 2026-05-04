"use client";

import { generateSheetHTML, type SheetData } from "@/lib/sheetTemplate";

type SheetPreviewProps = {
  data: SheetData;
};

export function SheetPreview({ data }: SheetPreviewProps) {
  return (
    <div className="sticky top-6 overflow-hidden border border-black bg-white">
      <iframe
        title="Sheet preview"
        srcDoc={generateSheetHTML(data, "")}
        className="h-[72vh] w-full origin-top bg-white"
      />
    </div>
  );
}
