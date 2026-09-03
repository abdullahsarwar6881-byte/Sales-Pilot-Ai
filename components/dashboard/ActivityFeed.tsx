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
    <div className="rounded-2xl border border-theme bg-card p-4 sm:p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Recent Activity
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Latest actions across your workspace.
          </p>
        </div>

        <CheckCircle2
          className="text-emerald-500"
          size={20}
        />
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">
          Loading activity...
        </p>
      )}

      {!loading && activities.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No activity yet.
        </p>
      )}

      <div className="space-y-3.5">
        {activities.map((activity) => {
          const Icon = getIcon(activity.type);

          return (
            <div
              key={activity.id}
              className="flex gap-3 items-start"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-foreground truncate">
                  {activity.title}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {activity.description}
                </p>

                <p className="mt-1 text-[10px] text-muted-foreground/80">
                  {timeAgo(activity.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}