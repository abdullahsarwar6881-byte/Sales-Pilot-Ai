"use client";


import {useEffect,useState} from "react";


export default function AnalyticsPage(){


const [data,setData] =
useState<any>(null);



useEffect(()=>{


fetch("/api/analytics")
.then(res=>res.json())
.then(setData);


},[]);




if(!data){

return (

<div className="p-10 text-white">
Loading analytics...
</div>

)

}



return (

<div className="
min-h-screen
bg-[#0F172A]
text-white
p-8
">


<h1 className="
text-3xl
font-bold
">

Analytics Dashboard

</h1>



<div className="
grid
grid-cols-4
gap-6
mt-8
">



<Card
title="Total Chats"
value={data.totalChats}
/>



<Card
title="AI Solved %"
value={`${data.aiSolvedPercentage}%`}
/>



<Card
title="Human Takeovers"
value={data.humanTakeovers}
/>



<Card
title="Active AI Agents"
value="Online"
/>



</div>





<div className="
mt-10
bg-slate-900
rounded-2xl
p-6
">


<h2 className="
text-xl
font-bold
mb-5
">

Popular Questions

</h2>



{
data.popularQuestions.map(
(q:any,index:number)=>(


<div
key={index}
className="
border-b
border-slate-800
py-3
flex
justify-between
"
>


<span>
{q.question}
</span>


<span className="
text-indigo-400
">

{q.count}

</span>


</div>


)

)

}



</div>




</div>

)

}




function Card(
{
title,
value
}:{
title:string,
value:any
}
){

return (

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<p className="
text-slate-400
text-sm
">

{title}

</p>


<h2 className="
text-3xl
font-bold
mt-3
">

{value}

</h2>


</div>

)

}