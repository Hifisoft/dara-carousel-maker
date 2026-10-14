import { NextRequest, NextResponse } from 'next/server';
import { adminClient, authenticatedUser } from '../../../../../../lib/serverAuth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { id, userId } = await params;
    const admin = adminClient();
    const { data: membership } = await admin.from('organisation_members').select('role')
      .eq('organisation_id', id).eq('user_id', user.id).maybeSingle();
    if (membership?.role !== 'owner') return NextResponse.json({ error: 'Only owners can remove members.' }, { status: 403 });
    if (userId === user.id) return NextResponse.json({ error: 'The owner cannot remove themselves.' }, { status: 400 });
    const { error } = await admin.from('organisation_members').delete()
      .eq('organisation_id', id).eq('user_id', userId).eq('role', 'member');
    if (error) throw error;
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Remove member failed:', error);
    return NextResponse.json({ error: 'Could not remove member.' }, { status: 500 });
  }
}
