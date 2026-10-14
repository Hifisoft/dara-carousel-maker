import { NextRequest, NextResponse } from 'next/server';
import { adminClient, authenticatedUser } from '../../../lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.email) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.replace(/[\x00-\x1f\x7f]/g, ' ').trim() : '';
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Organisation name must be 2-80 characters.' }, { status: 400 });
    }
    const admin = adminClient();
    const { count } = await admin.from('organisations').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    if ((count || 0) >= 5) return NextResponse.json({ error: 'You have reached the organisation limit.' }, { status: 429 });
    const { data: organisation, error } = await admin.from('organisations')
      .insert({ name, owner_id: user.id }).select('id, name').single();
    if (error) throw error;
    const { error: memberError } = await admin.from('organisation_members').insert({
      organisation_id: organisation.id, user_id: user.id, email: user.email.toLowerCase(), role: 'owner'
    });
    if (memberError) {
      await admin.from('organisations').delete().eq('id', organisation.id);
      throw memberError;
    }
    return NextResponse.json({ organisation }, { status: 201 });
  } catch (error) {
    console.error('Create organisation failed:', error);
    return NextResponse.json({ error: 'Could not create organisation.' }, { status: 500 });
  }
}
