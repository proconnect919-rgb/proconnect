import { createClient } from '@supabase/supabase-js';
import { serve } from 'https://deno.land/std/http/server.ts';
import bcrypt from 'https://deno.land/x/bcrypt/mod.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const { email, password } = await req.json();
    console.log(`Login attempt for email: ${email}`);

    const { data, error } = await supabase
      .from('admins')
      .select('id, role, password_hash')
      .eq('email', email)
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log('No admin found or query error:', error);
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const admin = data[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);
    console.log('Password verification result:', isValid);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const roles = ['Super Admin', 'Admin', 'Finance', 'Moderator', 'Auditor', 'Developer'];
    if (!roles.includes(admin.role)) {
      console.log('Invalid role:', admin.role);
      return new Response(JSON.stringify({ error: 'User is not an admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ id: admin.id, role: admin.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Server error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      });
  }
});