import { createClient } from "@/lib/supabase/server";


export async function getDashboardStats() {


  const supabase = await createClient();



  const {
    data:{
      user
    }
  } = await supabase.auth.getUser();




  if(!user){

    return null;

  }




  const [
    conversations,
    documents,
    pages
  ] = await Promise.all([


    supabase
      .from("conversations")
      .select("*",{count:"exact",head:true})
      .eq("user_id",user.id),




    supabase
      .from("knowledge_documents")
      .select("*",{count:"exact",head:true})
      .eq("user_id",user.id),




    supabase
      .from("knowledge_pages")
      .select("*",{count:"exact",head:true})
      .eq("user_id",user.id)



  ]);





  return {


    conversations:
      conversations.count ?? 0,


    documents:
      documents.count ?? 0,


    pages:
      pages.count ?? 0,


  };


}