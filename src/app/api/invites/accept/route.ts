import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminClient, authenticatedUser } from '../../../../lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.email || !user.email_confirmed_at) return NextResponse.json({ error: 'Sign in with the verified invited email address.' }, { status: 401 });
    const { token } = await request.json();
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 400 });
    }
    const admin = adminClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: invite } = await admin.from('organisation_invites').select('id, organisation_id, email, expires_at, accepted_at')
      .eq('token_hash', tokenHash).maybeSingle();
    if (!invite || invite.accepted_at || Date.parse(invite.expires_at) < Date.now()) {
      return NextResponse.json({ error: 'This invitation has expired or was already used.' }, { status: 410 });
    }
    if (invite.email !== user.email.toLowerCase()) {
      return NextResponse.json({ error: `Sign in as ${invite.email} to accept this invitation.` }, { status: 403 });
    }
    const { error } = await admin.from('organisation_members').upsert({
      organisation_id: invite.organisation_id, user_id: user.id,
      email: user.email.toLowerCase(), role: 'member'
    }, { onConflict: 'organisation_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
    await admin.from('organisation_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
    return NextResponse.json({ organisationId: invite.organisation_id });
  } catch (error) {
    console.error('Accept invite failed:', error);
    return NextResponse.json({ error: 'Could not accept invitation.' }, { status: 500 });
  }
}
