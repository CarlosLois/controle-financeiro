import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SetPasswordRequest {
  email: string;
  organizationId: string;
  password: string;
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

    const { email, organizationId, password }: SetPasswordRequest = await req.json();

    if (!email || !organizationId || !password) {
      throw new Error("Email, ID da organização e senha são obrigatórios");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres");
    }

    // Find user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      throw new Error("Usuário não encontrado");
    }

    // Check if user is a member of this organization with password_set = false
    const { data: member, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("id, password_set")
      .eq("user_id", existingUser.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !member) {
      throw new Error("Usuário não é membro desta organização");
    }

    if (member.password_set) {
      throw new Error("Senha já foi definida. Use a opção de login.");
    }

    // Update user password using admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password }
    );

    if (updateError) {
      throw new Error(`Erro ao definir senha: ${updateError.message}`);
    }

    // Update password_set flag
    const { error: flagError } = await supabaseAdmin
      .from("organization_members")
      .update({ password_set: true })
      .eq("id", member.id);

    if (flagError) {
      throw new Error(`Erro ao atualizar status: ${flagError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha definida com sucesso"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in set-first-password:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
