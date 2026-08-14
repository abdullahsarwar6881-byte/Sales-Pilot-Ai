"use client";

interface Props {

url:string;

setUrl:(value:string)=>void;

syncing:boolean;

syncMessage:string;

onGenerate:()=>void;

}


export default function WebsiteCard({

url,

setUrl,

syncing,

syncMessage,

onGenerate

}:Props){


return (

<div className="rounded-xl border p-6 mt-6">


<h2 className="text-xl font-semibold">

Sync Website

</h2>


<p className="text-sm text-gray-500 mt-2">

Connect your website and let AI learn your products, policies and pages.

</p>



<input

className="border rounded-lg w-full p-3 mt-4"

placeholder="https://yourwebsite.com"

value={url}

onChange={(e)=>
setUrl(e.target.value)
}

/>



<button

className="mt-4 rounded-lg bg-black text-white px-5 py-3"

disabled={syncing}

onClick={onGenerate}

>

{
syncing
?
"Scanning Website..."
:
"Sync Website"
}

</button>



{
syncMessage && (

<p className="mt-3 text-sm">

{syncMessage}

</p>

)

}



</div>

);


}