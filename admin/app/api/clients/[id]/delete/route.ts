import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (user.id === id) return NextResponse.json({ error: 'A coach account is not deleted from here.' }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient.from('profiles').select('email').eq('id', id).maybeSingle();
  if (profile?.email) {
    await adminClient.from('invitations').delete().ilike('email', profile.email);
  }
  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
