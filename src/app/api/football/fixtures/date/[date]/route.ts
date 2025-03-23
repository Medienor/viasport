import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    // Get the date from the URL parameter
    const date = params.date;
    
    console.log(`Fetching fixtures for date: ${date}`);
    
    // Use a hardcoded API key for testing if needed
    const apiKey = process.env.RAPID_API_KEY;
    if (!apiKey) {
      console.error('RAPID_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }
    
    // Construct the API URL
    const apiUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${date}`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in fixtures API route:`, error);
    return NextResponse.json(
      { error: `Failed to fetch fixtures`, message: (error as Error).message },
      { status: 500 }
    );
  }
} 