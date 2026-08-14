"use client";

import {
  MessageSquare,
  Bot,
  Clock3,
  Users,
} from "lucide-react";

import { motion } from "framer-motion";


interface Props {
  total: number;
  aiResolved: number;
  humanSupport: number;
  avgResponse: string;
}



export default function ConversationStats({

  total,

  aiResolved,

  humanSupport,

  avgResponse,

}: Props) {



const stats = [

{
title: "Total Conversations",
value: total.toLocaleString(),
change: "Live",
icon: MessageSquare,
color: "from-indigo-500 to-violet-600",
},


{
title: "Resolved by AI",
value: aiResolved.toLocaleString(),
change: "Live",
icon: Bot,
color: "from-emerald-500 to-green-600",
},


{
title: "Human Support",
value: humanSupport.toLocaleString(),
change: "Live",
icon: Users,
color: "from-orange-500 to-red-500",
},


{
title: "Avg Response",
value: avgResponse,
change: "Calculated",
icon: Clock3,
color: "from-blue-500 to-cyan-500",
},

];




return (

<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">


{
stats.map((item)=>{

const Icon = item.icon;


return (

<motion.div

key={item.title}

whileHover={{y:-4}}

transition={{duration:0.2}}

className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"

>


<div className="flex items-center justify-between">


<div>


<p className="text-sm text-slate-500">

{item.title}

</p>


<h2 className="mt-3 text-4xl font-bold text-slate-900">

{item.value}

</h2>


<p className="mt-2 text-sm font-medium text-emerald-600">

{item.change}

</p>


</div>




<div

className={`rounded-2xl bg-gradient-to-br ${item.color} p-4 text-white`}

>

<Icon size={26}/>


</div>



</div>


</motion.div>


);


})

}


</div>

);

}