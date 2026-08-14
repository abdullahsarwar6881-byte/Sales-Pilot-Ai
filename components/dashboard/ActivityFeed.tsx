"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import {
  Globe,
  FileText,
  Bot,
  Paintbrush,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";


interface Activity {

  id:string;

  title:string;

  description:string;

  type:string;

  created_at:string;

}



export default function ActivityFeed(){


const supabase=createClient();


const [activities,setActivities]=useState<Activity[]>([]);

const [loading,setLoading]=useState(true);




useEffect(()=>{

loadActivities();

},[]);





async function loadActivities(){


const {
data:{
user
}
}=await supabase.auth.getUser();



if(!user){

setLoading(false);

return;

}




const {
data,
error
}=await supabase

.from("activities")

.select("*")

.eq("user_id",user.id)

.order("created_at",{
ascending:false
})

.limit(5);





if(error){

console.log(error);

}



setActivities(data ?? []);

setLoading(false);


}





function getIcon(type:string){


switch(type){


case "website":

return Globe;


case "document":

return FileText;


case "ai":

return Bot;


case "widget":

return Paintbrush;


default:

return CheckCircle2;


}


}





function timeAgo(date:string){


const minutes =
Math.floor(
(Date.now()-new Date(date).getTime())
/60000
);



if(minutes < 1)

return "Just now";



if(minutes < 60)

return `${minutes} min ago`;



const hours =
Math.floor(minutes/60);



return `${hours} hour ago`;

}





return (

<motion.div

whileHover={{y:-4}}

transition={{duration:0.2}}

className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"

>



<div className="mb-6 flex items-center justify-between">


<div>

<h2 className="text-xl font-bold text-slate-900">

Recent Activity

</h2>


<p className="mt-1 text-sm text-slate-500">

Latest actions across your workspace.

</p>


</div>


<CheckCircle2
className="text-emerald-500"
size={24}
/>


</div>





{
loading && (

<p className="text-sm text-slate-500">

Loading activity...

</p>

)

}





{
!loading && activities.length===0 && (

<p className="text-sm text-slate-500">

No activity yet.

</p>

)

}







<div className="space-y-5">


{
activities.map((activity)=>{


const Icon=getIcon(activity.type);



return (

<div
key={activity.id}
className="flex gap-4"
>


<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">

<Icon size={20}/>

</div>



<div className="flex-1">


<h3 className="font-semibold text-slate-900">

{activity.title}

</h3>



<p className="mt-1 text-sm text-slate-500">

{activity.description}

</p>



<p className="mt-2 text-xs text-slate-400">

{timeAgo(activity.created_at)}

</p>



</div>



</div>

)

})

}


</div>



</motion.div>

);


}