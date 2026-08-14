"use client";

import { Upload, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  uploading: boolean;
  uploadMessage: string;
  onUpload: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

export default function UploadCard({
  uploading,
  uploadMessage,
  onUpload,
}: Props) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-3 text-white">
          <Upload size={24} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Upload Documents
          </h2>

          <p className="text-sm text-slate-500">
            Train your AI with PDFs, DOCX and TXT files.
          </p>
        </div>
      </div>

      <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 transition hover:border-indigo-400 hover:bg-indigo-50">

        <Upload
          className="mb-4 text-indigo-600"
          size={42}
        />

        <h3 className="text-lg font-semibold text-slate-900">
          {uploading
            ? "Uploading..."
            : "Drag & Drop Files"}
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          or click here to browse
        </p>

        <div className="mt-6 flex gap-2">

          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">
            PDF
          </span>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">
            DOCX
          </span>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">
            TXT
          </span>

        </div>

        <input
          hidden
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={onUpload}
        />

      </label>

      {uploadMessage && (
        <div className="mt-6 rounded-2xl bg-indigo-50 p-4">
          <div className="flex items-center gap-2">

            <FileText
              className="text-indigo-600"
              size={18}
            />

            <p className="text-sm font-medium text-indigo-700">
              {uploadMessage}
            </p>

          </div>
        </div>
      )}
    </motion.div>
  );
}