"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Trash2,
  CheckCircle2,
  Clock3,
} from "lucide-react";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  processing_status?: string;
  created_at?: string;
}

interface Props {
  documents: Document[];
  onDelete: (doc: Document) => void;
}

export default function DocumentList({
  documents,
  onDelete,
}: Props) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">

        <h2 className="text-xl font-bold text-slate-900">
          Uploaded Documents
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Documents currently used to train your AI.
        </p>

      </div>

      {documents.length === 0 ? (

        <div className="flex flex-col items-center justify-center py-14">

          <FileText
            size={48}
            className="text-slate-300"
          />

          <h3 className="mt-4 text-lg font-semibold text-slate-700">
            No Documents Yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Upload your first PDF, DOCX or TXT file.
          </p>

        </div>

      ) : (

        <div className="space-y-4">

          {documents.map((doc) => (

            <div
              key={doc.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
            >

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">

                  <FileText size={22} />

                </div>

                <div>

                  <h3 className="font-semibold text-slate-900">
                    {doc.file_name}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {doc.file_type}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-4">

                <div>

                  {doc.processing_status ===
                  "processing" ? (

                    <span className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">

                      <Clock3 size={14} />

                      Processing

                    </span>

                  ) : (

                    <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">

                      <CheckCircle2 size={14} />

                      Ready

                    </span>

                  )}

                </div>

                <button
                  onClick={() => onDelete(doc)}
                  className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                >

                  <Trash2 size={18} />

                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </motion.div>
  );
}