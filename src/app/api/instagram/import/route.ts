import { NextRequest, NextResponse } from 'next/server';

type InstagramMedia = {
  id: string;
  permalink?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  children?: { data?: Array<{ media_type?: string; media_url?: string }> };
};

function isInstagramPostUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname) && /^\/p\/[\w-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function samePost(a: string, b: string) {
  try {
    return new URL(a).pathname.replace(/\/$/, '') === new URL(b).pathname.replace(/\/$/, '');
  } catch {
    return false;
  }
}

async function downloadImage(mediaUrl: string): Promise<string> {
  let url = new URL(mediaUrl);
  for (let redirect = 0; redirect < 3; redirect++) {
    if (url.protocol !== 'https:' || !/(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)) {
      throw new Error('Instagram returned an unsupported media location.');
    }
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new Error('Instagram image redirect was incomplete.');
      url = new URL(next, url);
      continue;
    }
    if (!response.ok) throw new Error('An Instagram image could not be downloaded.');
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('An Instagram slide was not an image.');
    if (Number(response.headers.get('content-length') || 0) > 8 * 1024 * 1024) throw new Error('An Instagram image exceeded the 8 MB limit.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new Error('An Instagram image exceeded the 8 MB limit.');
    return `data:${type};base64,${bytes.toString('base64')}`;
  }
  throw new Error('Too many redirects while downloading an Instagram image.');
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!isInstagramPostUrl(url)) return NextResponse.json({ error: 'Enter a valid Instagram post URL.' }, { status: 400 });
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'Instagram import needs INSTAGRAM_ACCESS_TOKEN configured on the server for an account you manage.' }, { status: 503 });

    const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
    const endpoint = accountId
      ? `https://graph.facebook.com/v23.0/${encodeURIComponent(accountId)}/media`
      : 'https://graph.instagram.com/me/media';
    let next: string | null = `${endpoint}?${new URLSearchParams({ fields: 'id,permalink,caption,media_type,media_url,children{media_type,media_url}', limit: '100' })}`;
    let match: InstagramMedia | undefined;
    for (let page = 0; next && page < 5 && !match; page++) {
      const pageUrl = new URL(next);
      if (!['graph.instagram.com', 'graph.facebook.com'].includes(pageUrl.hostname) || pageUrl.protocol !== 'https:') break;
      const response = await fetch(pageUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) return NextResponse.json({ error: 'Instagram could not access this account. Check the token and media permissions.' }, { status: 502 });
      const data: { data?: InstagramMedia[]; paging?: { next?: string } } = await response.json();
      match = data.data?.find(item => item.permalink && samePost(item.permalink, url));
      next = data.paging?.next || null;
    }
    if (!match) return NextResponse.json({ error: 'Post not found in the connected account’s recent media. Only posts that account can access can be imported.' }, { status: 404 });

    const media = match.media_type === 'CAROUSEL_ALBUM' ? match.children?.data || [] : [match];
    const imageUrls = media.filter(item => item.media_type === 'IMAGE' && item.media_url).map(item => item.media_url as string);
    if (!imageUrls.length) return NextResponse.json({ error: 'This post has no importable image slides.' }, { status: 422 });
    const images = await Promise.all(imageUrls.slice(0, 20).map(downloadImage));
    return NextResponse.json({ sourceUrl: match.permalink, caption: match.caption || '', images });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Instagram import failed.' }, { status: 502 });
  }
}
