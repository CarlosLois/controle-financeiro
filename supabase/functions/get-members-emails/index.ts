import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Não autorizado");
    }

    // Get the user's organization
    const { data: orgId } = await supabaseAdmin.rpc("get_user_organization_id", {
      _user_id: requestingUser.id,
    });

    if (!orgId) {
      throw new Error("Usuário não pertence a nenhuma organização");
    }

    // Get all members of the organization
    const { data: members, error: membersError } = await supabaseAdmin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId);

    if (membersError) {
      throw new Error(`Erro ao buscar membros: ${membersError.message}`);
    }

    // Get emails for all members
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    const memberEmails: Record<string, string> = {};
    
    for (const member of members || []) {
      const user = allUsers?.users?.find(u => u.id === member.user_id);
      if (user?.email) {
        memberEmails[member.user_id] = user.email;
      }
    }

    return new Response(
      JSON.stringify({ emails: memberEmails }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-members-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
