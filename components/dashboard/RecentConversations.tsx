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

<motion.div

whileHover={{ y:-4 }}

transition={{
duration:0.2
}}

className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"

>



<div className="mb-6 flex items-center justify-between">


<div>

<h2 className="text-xl font-bold text-slate-900">

Recent Conversations

</h2>


<p className="mt-1 text-sm text-slate-500">

Latest customer messages handled by your AI.

</p>


</div>



<MessageSquare
className="text-indigo-500"
size={24}
/>


</div>





{
loading && (

<p className="text-sm text-slate-500">

Loading conversations...

</p>

)

}





{
!loading && conversations.length === 0 && (

<p className="text-sm text-slate-500">

No conversations yet.

</p>

)

}






<div className="space-y-4">


{
conversations.map((chat)=>(


<div

key={chat.id}

className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"

>


<div className="flex items-center gap-4">


<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold">

{
chat.customer_name?.charAt(0) ?? "C"
}

</div>



<div>


<h3 className="font-semibold text-slate-900">

{chat.customer_name}

</h3>



<p className="mt-1 text-sm text-slate-500">

{chat.message}

</p>


</div>


</div>





<div className="text-right">


<div className="flex items-center justify-end gap-2">


{
chat.status === "ai" ? (

<Bot
className="text-emerald-500"
size={18}
/>

):(


<User
className="text-orange-500"
size={18}
/>


)

}



<span className="text-sm font-medium text-slate-700">

{
chat.status === "ai"
?
"AI"
:
"Human"
}

</span>



</div>



<p className="mt-2 text-xs text-slate-500">

{
timeAgo(chat.created_at)
}

</p>



</div>



</div>


))

}


</div>



</motion.div>

);

}