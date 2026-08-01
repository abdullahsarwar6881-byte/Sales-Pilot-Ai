'use client';

import React, { useState } from 'react';
import { GlobeAltIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function KnowledgeBase() {
  const [urlInput, setUrlInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleWebsiteSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setIsSyncing(true);
    setSyncMessage('Connecting to website target paths...');

    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const result = await response.json();
      if (result.success) {
        setSyncMessage('Website linked! AI is processing layout text rows inside your Supabase dashboard.');
        setUrlInput('');
      } else {
        setSyncMessage('Error initializing tracking system pipeline.');
      }
    } catch (err) {
      setSyncMessage('Network resolution error occurred.');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncMessage('');
      }, 4000);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-[#0F172A] text-slate-100 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Knowledge Base</h1>
        <p className="text-slate-400 mt-2">Train your Sales Pilot AI workforce on your unique operational content repositories.</p>
      </div>

      {/* Sync Web Module */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
          <GlobeAltIcon className="w-5 h-5 text-indigo-400" />
          Sync Business Website
        </h2>
        <form onSubmit={handleWebsiteSync} className="flex gap-4">
          <input
            type="url"
            required
            placeholder="https://yourbusiness.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Website'
            )}
          </button>
        </form>
        {syncMessage && (
          <p className="mt-4 text-sm text-indigo-400 animate-pulse font-medium bg-indigo-950/30 p-3 rounded-lg border border-indigo-900/50">
            {syncMessage}
          </p>
        )}
      </div>

      {/* Grid Layout Documentation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-cyan-950 border border-cyan-800 rounded-xl flex items-center justify-center mb-4">
              <DocumentTextIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Upload Training Documents</h3>
            <p className="text-slate-400 text-sm mt-1">Supports PDF, DOCX, TXT, and CSV catalog structures up to 25MB.</p>
          </div>
          <button type="button" className="mt-6 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium py-2.5 rounded-xl transition-colors w-full">
            Browse System Files
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-purple-950 border border-purple-800 rounded-xl flex items-center justify-center mb-4">
              <GlobeAltIcon className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Active Scanned Document Assets</h3>
            <p className="text-slate-400 text-sm mt-1">View indexed links, update triggers, or clear training items in real-time.</p>
          </div>
          <div className="mt-6 flex gap-3 text-xs text-slate-400">
            <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">Sync Interval: Manual</span>
            <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">Default Language: English</span>
          </div>
        </div>
      </div>
    </div>
  );
}
