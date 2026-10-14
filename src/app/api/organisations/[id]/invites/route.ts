import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminClient, authenticatedUser } from '../../../../../lib/serverAuth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id } = await params;
    const admin = adminClient();
    const { data: membership } = await admin.from('organisation_members').select('role')
      .eq('organisation_id', id).eq('user_id', user.id).maybeSingle();
    if (membership?.role !== 'owner') return NextResponse.json({ error: 'Only owners can invite members.' }, { status: 403 });

    const { email: submittedEmail } = await request.json();
    const email = typeof submittedEmail === 'string' ? submittedEmail.trim().toLowerCase() : '';
    if (email.length > 254 || !emailPattern.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    const { data: existing } = await admin.from('organisation_members').select('user_id')
      .eq('organisation_id', id).eq('email', email).maybeSingle();
    if (existing) return NextResponse.json({ error: 'This person is already a member.' }, { status: 409 });
    const { count } = await admin.from('organisation_invites').select('id', { count: 'exact', head: true })
      .eq('organisation_id', id).gte('created_at', new Date(Date.now() - 86400000).toISOString());
    if ((count || 0) >= 20) return NextResponse.json({ error: 'Invite limit reached for today.' }, { status: 429 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const resendKey = process.env.RESEND_API_KEY;
    const sender = process.env.INVITE_FROM_EMAIL;
    if (!appUrl || !resendKey || !sender) {
      return NextResponse.json({ error: 'Invite email is not configured on this server.' }, { status: 503 });
    }
    const { data: organisation } = await admin.from('organisations').select('name').eq('id', id).single();
    if (!organisation) return NextResponse.json({ error: 'Organisation not found.' }, { status: 404 });
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const { data: invite, error } = await admin.from('organisation_invites').insert({
      organisation_id: id, email, token_hash: tokenHash, invited_by: user.id, expires_at: expiresAt
    }).select('id').single();
    if (error) throw error;
    const inviteUrl = new URL('/', appUrl);
    inviteUrl.searchParams.set('invite', token);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender, to: [email], subject: `Join ${organisation.name} on DARA Studio`,
        text: `You have been invited to join ${organisation.name} on DARA Studio. Sign in with ${email} and accept your invitation here: ${inviteUrl.toString()}\n\nThis invitation expires in 7 days.`
      })
    });
    if (!response.ok) {
      await admin.from('organisation_invites').delete().eq('id', invite.id);
      return NextResponse.json({ error: 'Invite email could not be sent. Check your email provider.' }, { status: 502 });
    }
    return NextResponse.json({ sent: true }, { status: 201 });
  } catch (error) {
    console.error('Send invite failed:', error);
    return NextResponse.json({ error: 'Could not send invite.' }, { status: 500 });
  }
}
