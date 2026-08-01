'use client';

import React, { useState } from 'react';
import { PaintBrushIcon, CodeBracketIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

export default function WidgetStudio() {
  const [aiName, setAiName] = useState('Pilot Bot');
  const [welcomeMsg, setWelcomeMsg] = useState('Hello! How can I assist your business today?');
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [isCopied, setIsCopied] = useState(false);

  const generatedEmbedCode = `<!-- Sales Pilot Chat Widget Embed -->
<script>
  window.SalesPilotConfig = {
    aiName: "${aiName}",
    welcomeMessage: "${welcomeMsg}",
    brandColor: "${brandColor}"
  };
</script>
<script src="https://salespilot.ai" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmbedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#0F172A] text-slate-100 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Chat Widget Studio</h1>
        <p className="text-slate-400 mt-2">Design, style, and generate implementation scripts for your website interface.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Customization Options Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PaintBrushIcon className="w-5 h-5 text-indigo-400" />
            Visual Customization
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">AI Assistant Identity</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Greeting Configuration</label>
              <textarea
                rows={3}
                value={welcomeMsg}
                onChange={(e) => setWelcomeMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brand Accent Theme</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Embed Script Output Window */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CodeBracketIcon className="w-4 h-4 text-cyan-400" />
              Installation Script
            </h3>
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
              {generatedEmbedCode}
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-md"
            >
              {isCopied ? 'Copied Code to Clipboard!' : 'Copy Implementation Widget Code'}
            </button>
          </div>
        </div>

        {/* Right Side: Live Visual Mockup Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between min-h-[500px] relative overflow-hidden">
          <div className="text-center space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Workspace Sandbox</span>
            <h2 className="text-sm font-semibold text-slate-400">Live Client Site Preview</h2>
          </div>

          <div className="w-full max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 flex items-center justify-between text-white border-b border-slate-800" style={{ backgroundColor: brandColor }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {aiName[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-none">{aiName}</h4>
                  <span className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 bg-green-400 rounded-full inline-block" />
                    Agent active
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4 h-48 bg-slate-900 overflow-y-auto text-xs flex flex-col justify-end">
              <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-none p-3 max-w-[85%] self-start shadow-sm">
                {welcomeMsg}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                disabled
                placeholder="Ask a customer support question..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 focus:outline-none"
              />
              <button type="button" className="p-1.5 rounded-lg text-white" style={{ backgroundColor: brandColor }}>
                <ChatBubbleLeftIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-600">
            Alter options on the left to review style properties in real-time.
          </div>
        </div>

      </div>
    </div>
  );
}
