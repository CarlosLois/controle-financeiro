import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckUserRequest {
  email: string;
  organizationId: string;
}

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

    const { email, organizationId }: CheckUserRequest = await req.json();

    if (!email || !organizationId) {
      throw new Error("Email e ID da organização são obrigatórios");
    }

    // Find user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      return new Response(
        JSON.stringify({ 
          exists: false,
          needsPassword: false,
          message: "Usuário não encontrado nesta organização"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is a member of this organization
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("id, password_set")
      .eq("user_id", existingUser.id)
      .eq("organization_id", organizationId)
      .single();

    if (!member) {
      return new Response(
        JSON.stringify({ 
          exists: false,
          needsPassword: false,
          message: "Usuário não é membro desta organização"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        exists: true,
        needsPassword: !member.password_set,
        message: member.password_set ? "Usuário pronto para login" : "Usuário precisa definir senha"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-new-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
