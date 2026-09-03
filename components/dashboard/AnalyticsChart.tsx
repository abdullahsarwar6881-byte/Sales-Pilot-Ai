"use client";

import { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { createClient } from "@/lib/supabase/client";


interface ChartData {

  name:string;

  conversations:number;

}



export default function AnalyticsChart(){


const supabase = createClient();


const [data,setData] = useState<ChartData[]>([]);


const [loading,setLoading] = useState(true);





useEffect(()=>{

loadAnalytics();

},[]);





async function loadAnalytics(){


const {
data:{
user
}
}=await supabase.auth.getUser();



if(!user){

setLoading(false);

return;

}





const startDate = new Date();

startDate.setDate(
startDate.getDate()-6
);

startDate.setHours(0,0,0,0);





const {
data:conversations,
error
}=await supabase

.from("conversations")

.select("created_at")

.eq("user_id",user.id)

.gte(
"created_at",
startDate.toISOString()
);





if(error){

console.log(error);

setLoading(false);

return;

}





const days = [
"Sun",
"Mon",
"Tue",
"Wed",
"Thu",
"Fri",
"Sat"
];





const chartData:ChartData[]=[];



for(let i=6;i>=0;i--){


const date = new Date();

date.setDate(
date.getDate()-i
);



const dayName =
days[date.getDay()];



const count =
conversations?.filter((item)=>{


const itemDate =
new Date(item.created_at);



return (

itemDate.getDate()
===
date.getDate()

&&

itemDate.getMonth()
===
date.getMonth()

&&

itemDate.getFullYear()
===
date.getFullYear()

);


}).length ?? 0;





chartData.push({

name:dayName,

conversations:count

});


}





setData(chartData);

setLoading(false);


}





  return (
    <div className="rounded-2xl border border-theme bg-card p-4 sm:p-5 shadow-xs transition-colors">
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground">
          Conversation Analytics
        </h2>

        <p className="text-xs text-muted-foreground mt-0.5">
          AI conversations during the last 7 days.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">
          Loading analytics...
        </p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ r: 4, fill: "#6366F1" }}
                activeDot={{ r: 6, fill: "#818cf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}