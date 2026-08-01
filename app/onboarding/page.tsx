'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [category, setCategory] = useState('Technology');
  const [assistantName, setAssistantName] = useState('Pilot Bot');
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  const startAITraining = () => {
    setIsTraining(true);
    const logs = [
      'Scanning Website Metadata...',
      'Reading Structural Pages...',
      'Understanding Product Context...',
      'Creating Vector Knowledge Base...',
      'Preparing AI Customer Support Employee...',
      'Configuration Completed Successfully!'
    ];

    logs.forEach((message, index) => {
      setTimeout(() => {
        setProgressLog((prev) => [...prev, message]);
        if (index === logs.length - 1) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      }, (index + 1) * 1200);
    });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Step Indicators */}
        {!isTraining && (
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Step {step} of 3</span>
            <div className="flex gap-1.5">
              <div className={`h-1.5 w-6 rounded-full transition-colors ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              <div className={`h-1.5 w-6 rounded-full transition-colors ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              <div className={`h-1.5 w-6 rounded-full transition-colors ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
            </div>
          </div>
        )}

        {/* Step 1: Core Profile */}
        {step === 1 && !isTraining && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Let's build your AI employee</h2>
            <p className="text-slate-400 text-sm">What is the official operational name of your business or online store?</p>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Business Name</label>
              <input
                type="text"
                placeholder="e.g. Alpha Clothing PK"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              disabled={!businessName}
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-all mt-4"
            >
              Continue Setup
            </button>
          </div>
        )}

        {/* Step 2: Website URL Context */}
        {step === 2 && !isTraining && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Provide your data source</h2>
            <p className="text-slate-400 text-sm">Enter your website domain URL so the AI can scan your FAQs, shipping updates, and catalogs.</p>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Website URL</label>
              <input
                type="url"
                placeholder="https://yourstore.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                Back
              </button>
              <button
                disabled={!websiteUrl}
                onClick={() => setStep(3)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-all"
              >
                Connect Target
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Assistant Persona Customization */}
        {step === 3 && !isTraining && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Name your AI workforce employee</h2>
            <p className="text-slate-400 text-sm">Give your chat agent a public helper identity that your consumers will interact with.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Agent Name</label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Fashion">Fashion & Apparel</option>
                  <option value="Technology">SaaS / Tech</option>
                  <option value="Healthcare">Healthcare Clinics</option>
                  <option value="Services">Local Service Agency</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(2)} className="flex-1 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium py-3 rounded-xl transition-colors">
                Back
              </button>
              <button
                onClick={startAITraining}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                Launch AI Agent Build
              </button>
            </div>
          </div>
        )}

        {/* Animated AI Engine Training Step */}
        {isTraining && (
          <div className="space-y-6 text-center py-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Training {assistantName}</h3>
              <p className="text-sm text-slate-400">Sales Pilot core matrices are mapping data vectors for your business profile.</p>
            </div>
            <div className="bg-slate-950 rounded-2xl p-4 text-left font-mono text-xs text-indigo-400 border border-slate-800 space-y-1.5 h-40 overflow-y-auto max-h-40">
              {progressLog.map((log, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
