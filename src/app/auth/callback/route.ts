import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure dynamic handling

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    try {
      await supabase.auth.exchangeCodeForSession(code);
      // Successfully exchanged code for session
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      // Handle error, maybe redirect to an error page
      return NextResponse.redirect(`${requestUrl.origin}/auth-error`); // Example error redirect
    }
  } else {
    console.warn("No code found in auth callback request.");
    // Handle case where no code is present, maybe redirect to login
    return NextResponse.redirect(`${requestUrl.origin}/`); // Redirect home or to login
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}