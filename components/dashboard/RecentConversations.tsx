"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

import { createClient } from "@/lib/supabase/client";


interface Conversation {

  id: string;

  customer_name: string;

  message: string;

  status: string;

  created_at: string;

}



export default function RecentConversations() {


  const supabase = createClient();


  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    loadConversations();

  }, []);





  async function loadConversations() {


    const {
      data:{
        user
      }
    } = await supabase.auth.getUser();



    if(!user){

      setLoading(false);

      return;

    }




    const {
      data,
      error
    } = await supabase

      .from("conversations")

      .select("*")

      .eq("user_id", user.id)

      .order("created_at", {
        ascending:false
      })

      .limit(5);




    if(error){

      console.log(error);

    }



    setConversations(data ?? []);

    setLoading(false);


  }





  function timeAgo(date:string){


    const diff =
      Date.now() - new Date(date).getTime();


    const minutes =
      Math.floor(diff / 60000);



    if(minutes < 1){

      return "Just now";

    }


    if(minutes < 60){

      return `${minutes} min ago`;

    }


    const hours =
      Math.floor(minutes / 60);


    return `${hours} hour ago`;

  }





  return (
    <div className="rounded-2xl border border-theme bg-card p-4 sm:p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Recent Conversations
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Latest customer messages handled by your AI.
          </p>
        </div>

        <MessageSquare
          className="text-indigo-500"
          size={20}
        />
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">
          Loading conversations...
        </p>
      )}

      {!loading && conversations.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No conversations yet.
        </p>
      )}

      <div className="space-y-2.5">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center justify-between rounded-xl border border-theme bg-card p-3 transition hover:bg-hover gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs shadow-xs">
                {chat.customer_name?.charAt(0) ?? "C"}
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-xs text-foreground truncate">
                  {chat.customer_name}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {chat.message}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5">
                {chat.status === "ai" ? (
                  <Bot
                    className="text-emerald-500"
                    size={14}
                  />
                ) : (
                  <User
                    className="text-orange-500"
                    size={14}
                  />
                )}

                <span className="text-xs font-medium text-foreground">
                  {chat.status === "ai" ? "AI" : "Human"}
                </span>
              </div>

              <p className="mt-1 text-[10px] text-muted-foreground">
                {timeAgo(chat.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}