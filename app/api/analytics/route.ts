import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function GET(){

try{


// Total conversations

const {
 count: totalChats
}
=
await supabaseAdmin
.from("conversations")
.select("*",{count:"exact",head:true});




// Human takeover count

const {
 count: humanTakeovers
}
=
await supabaseAdmin
.from("conversations")
.select("*",{count:"exact",head:true})
.eq(
"assigned_to",
"human"
);




// AI solved

const {
 count: aiSolved
}
=
await supabaseAdmin
.from("conversations")
.select("*",{count:"exact",head:true})
.eq(
"assigned_to",
"ai"
)
.eq(
"status",
"resolved"
);





// Get customer questions

const {
 data:messages
}
=
await supabaseAdmin
.from("conversation_messages")
.select(
"content"
)
.eq(
"sender",
"customer"
)
.limit(100);





const questionMap:any = {};



messages?.forEach(
(msg)=>{

const text =
msg.content;


questionMap[text] =
(questionMap[text] || 0) + 1;


}
);



const popularQuestions =
Object.entries(questionMap)
.sort(
(a:any,b:any)=>
b[1]-a[1]
)
.slice(0,5)
.map(
(item:any)=>({

question:item[0],
count:item[1]

})
);





const aiSolvedPercentage =
totalChats
?
Math.round(
((aiSolved || 0) /
totalChats) * 100
)
:
0;




return NextResponse.json({

totalChats:
totalChats || 0,

aiSolvedPercentage,

humanTakeovers:
humanTakeovers || 0,

popularQuestions

});



}
catch(error:any){


return NextResponse.json(
{
error:error.message
},
{
status:500
}
);


}


}