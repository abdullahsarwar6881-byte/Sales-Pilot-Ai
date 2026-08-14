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

<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<div className="mb-6">

<h2 className="text-xl font-bold text-slate-900">

Conversation Analytics

</h2>


<p className="mt-1 text-sm text-slate-500">

AI conversations during the last 7 days.

</p>


</div>




{
loading ? (

<p className="text-sm text-slate-500">

Loading analytics...

</p>

)

:

<div className="h-80">


<ResponsiveContainer
width="100%"
height="100%"
>


<LineChart data={data}>


<CartesianGrid strokeDasharray="3 3" />


<XAxis dataKey="name" />


<YAxis />


<Tooltip />



<Line

type="monotone"

dataKey="conversations"

stroke="#6366F1"

strokeWidth={4}

dot={{r:5}}

activeDot={{r:8}}

/>



</LineChart>


</ResponsiveContainer>


</div>

}


</div>

);


}