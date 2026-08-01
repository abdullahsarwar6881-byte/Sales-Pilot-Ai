'use client';

import React, { useState } from 'react';
import { 
  InboxIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  UserIcon, 
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline';

export default function ConversationsInbox() {
  const [activeTicket, setActiveTicket] = useState(0);
  const [replyInput, setReplyInput] = useState('');

  // Mocking deep live database rows for customer assistance sessions
  const conversationsData = [
    {
      id: 0,
      customerName: 'Zainab Ahmed',
      email: 'zainab.a@shop.pk',
      query: 'Do you deliver to Karachi within 48 hours?',
      status: 'Resolved',
      time: '5m ago',
      history: [
        { sender: 'user', text: 'Hi, I need an outfit for an event on Tuesday. Do you deliver to Karachi within 48 hours?' },
        { sender: 'ai', text: 'Hello Zainab! Yes, our express shipping tier guarantees delivery to Karachi inside 24 to 48 hours. Would you like me to help you check out with your cart items right now?' }
      ]
    },
    {
      id: 1,
      customerName: 'Bilal Khan',
      email: 'bkhan99@gmail.com',
      query: 'Is there a warranty profile on electronics catalog?',
      status: 'Needs Attention',
      time: '14m ago',
      history: [
        { sender: 'user', text: 'Is there a warranty profile on electronics catalog? Specifically the smart chargers.' },
        { sender: 'ai', text: 'Let me look that up... Our standard catalog items carry a 6-month repair warranty, but I am pulling specific smart charger parameters right now.' }
      ]
    },
    {
      id: 2,
      customerName: 'Sana Malik',
      email: 'sana.malik@outlook.com',
      query: 'Can I pay via Easypaisa or JazzCash?',
      status: 'Resolved',
      time: '1h ago',
      history: [
        { sender: 'user', text: 'Can I pay via Easypaisa or JazzCash?' },
        { sender: 'ai', text: 'Yes, Sana! We natively support both Easypaisa and JazzCash direct digital wallet transfers at our payment checkout step.' }
      ]
    }
  ];

  const currentChat = conversationsData[activeTicket];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput) return;
    currentChat.history.push({ sender: 'human', text: replyInput });
    setReplyInput('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#0F172A] text-slate-100 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Live Conversation Inbox</h1>
        <p className="text-slate-400 mt-2">Monitor ongoing AI assistant automation dialogues or override via human escalation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-slate-900 border border-slate-800 rounded-3xl h-[650px] overflow-hidden shadow-2xl">
        
        {/* Left Bar: Tickets Scroll List */}
        <div className="border-r border-slate-800 divide-y divide-slate-800/60 overflow-y-auto h-full bg-slate-900/50">
          <div className="p-4 bg-slate-900 sticky top-0 border-b border-slate-800 z-10 flex items-center gap-2">
            <InboxIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Chat Threads</span>
          </div>

          {conversationsData.map((chat, idx) => (
            <button
              key={chat.id}
              onClick={() => setActiveTicket(idx)}
              className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 focus:outline-none ${
                activeTicket === idx ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-bold text-white">{chat.customerName}</span>
                <span className="text-[10px] text-slate-500">{chat.time}</span>
              </div>
              <p className="text-xs text-slate-400 truncate w-full">"{chat.query}"</p>
              
              <div className="flex items-center gap-1.5 mt-1">
                {chat.status === 'Resolved' ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  chat.status === 'Resolved' ? 'text-emerald-400' : 'text-amber-400'
                }`}>{chat.status}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right 2 Columns: Selected Chat Window & Message Stream */}
        <div className="lg:col-span-2 flex flex-col justify-between h-full bg-slate-950/40">
          
          {/* Header Customer Strip */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{currentChat.customerName}</h3>
                <p className="text-xs text-slate-500">{currentChat.email}</p>
              </div>
            </div>
          </div>

          {/* Dialogue Message Container */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {currentChat.history.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col max-w-[75%] space-y-1 ${
                  msg.sender === 'user' 
                    ? 'self-start' 
                    : msg.sender === 'ai' 
                      ? 'self-end items-end ml-auto' 
                      : 'self-end items-end ml-auto'
                }`}
              >
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold px-1">
                  {msg.sender === 'user' ? 'Customer' : msg.sender === 'ai' ? 'AI Employee' : 'Human Override'}
                </span>
                <div className={`p-4.5 rounded-2xl p-3 shadow-md text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                    : msg.sender === 'ai'
                      ? 'bg-indigo-950/60 border border-indigo-900/50 text-indigo-200 rounded-tr-none'
                      : 'bg-emerald-950/60 border border-emerald-900/50 text-emerald-200 rounded-tr-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Human Reply Override Input Bar */}
          <form onSubmit={handleSendReply} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
            <input
              type="text"
              placeholder={`Type a message to override as Human Agent...`}
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
