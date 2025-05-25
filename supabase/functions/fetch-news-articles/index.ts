import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// --- Configuration ---
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const API_CALL_DELAY_MS = 120 // Delay between API calls

// --- Interfaces based on your sample news item ---
interface NewsAuthor {
  id: string
  full_name: string
}

interface NewsCategory {
  id: string
  title: string
  active: boolean
  entity_type: string
}

interface NewsImage {
  id: string
  description: string
  path: string
  urls: {
    uploaded?: {
      embed?: string
      gallery?: string
      thumbnail?: string
    }
  }
}

interface NewsUrls {
  external_url?: string | null
  canonical_url?: string | null
  public_url_desktop?: string | null
  public_url_mobile?: string | null
  public_url_amp?: string | null
  audio_url?: string | null
}

interface NewsSeo {
  title: string
  description: string
  slug: string
  keywords: string[]
  index: boolean
}

interface SportsRelatedItem {
  type: string // 'team', 'tournament', etc.
  provider: string
  data: {
    id: number
    name: string
    slug?: string
    uuid?: string
  }
}

interface NewsItem {
  id: string
  title: string
  subtitle?: string
  custom_author?: string
  entity_type: string
  language: string
  status: string
  type: string
  created_at: string
  updated_at: string
  published_at: string
  content_updated_at: string
  body: any[] // Array of editor blocks
  image?: {
    data: NewsImage
  }
  category: NewsCategory
  created_by: NewsAuthor
  urls: NewsUrls
  seo: NewsSeo
  sports_related: SportsRelatedItem[]
  published_regions: any[]
  published_channels: any[]
  adult_content: boolean
  betting_content: boolean
  sensitive_content: boolean
  run_ads: boolean
  live: boolean
  important: boolean
}

interface ApiResponse {
  homepageArticles?: {
    articles: NewsItem[]
  }
  topStories?: NewsItem[]
  categories?: any[]
}

// Add translation interfaces
interface TranslatedContent {
  nb_title: string
  nb_subtitle: string | null
  nb_seo_title: string
  nb_seo_description: string
  nb_seo_slug: string
  nb_body: any[]
}

interface TranslationSchema {
  nb_title: string
  nb_subtitle: string | null
  nb_seo_title: string
  nb_seo_description: string
  nb_seo_slug: string
  nb_body: Array<{
    type: string
    data?: any
    content?: any
  }>
}

// --- Utility Functions ---
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Add this helper function after the existing utility functions
function isArticleRecent(publishedAt: string, hoursLimit: number = 3): boolean {
  try {
    const publishedDate = new Date(publishedAt)
    const now = new Date()
    const hoursAgo = new Date(now.getTime() - (hoursLimit * 60 * 60 * 1000))
    
    const isRecent = publishedDate >= hoursAgo
    
    if (!isRecent) {
      const hoursOld = Math.round((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60))
      console.log(`⏰ Article too old: ${hoursOld} hours old (limit: ${hoursLimit} hours)`)
    }
    
    return isRecent
  } catch (error) {
    console.error(`❌ Error parsing date: ${publishedAt}`, error)
    return false
  }
}

// --- Core Logic ---
async function fetchNewsArticles(apiKey: string): Promise<NewsItem[]> {
  console.log('Fetching news articles from Livescore API...')
  
  try {
    // First, get the categories
    const categoriesUrl = 'https://livescore6.p.rapidapi.com/news/v2/list?limit=100'
    const categoriesOptions = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'livescore6.p.rapidapi.com',
      },
    }

    const categoriesResponse = await fetch(categoriesUrl, categoriesOptions)
    if (!categoriesResponse.ok) {
      console.error(`Categories API Error: ${categoriesResponse.status} ${categoriesResponse.statusText}`)
      return []
    }

    const categoriesData = await categoriesResponse.json()
    console.log('Categories response keys:', Object.keys(categoriesData))
    
    // Find the football category
    const footballCategory = categoriesData.categories?.find(cat => cat.title === 'football')
    if (!footballCategory) {
      console.error('Football category not found')
      return []
    }

    console.log('Found football category:', footballCategory.id)

    // Add delay between API calls
    await delay(API_CALL_DELAY_MS)

    // Now fetch articles from the football category
    const articlesUrl = `https://livescore6.p.rapidapi.com/news/v2/list-by-sport?category=${footballCategory.id}&page=1`
    const articlesOptions = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'livescore6.p.rapidapi.com',
      },
    }

    console.log('Fetching articles from:', articlesUrl)
    const articlesResponse = await fetch(articlesUrl, articlesOptions)
    
    if (!articlesResponse.ok) {
      console.error(`Articles API Error: ${articlesResponse.status} ${articlesResponse.statusText}`)
      return []
    }

    const articlesData = await articlesResponse.json()
    console.log('Articles response keys:', Object.keys(articlesData))
    console.log('Articles data length:', articlesData.data?.length || 0)
    
    if (articlesData.data && articlesData.data.length > 0) {
      console.log('First article keys:', Object.keys(articlesData.data[0]))
      console.log(`Successfully fetched ${articlesData.data.length} news articles`)
      return articlesData.data
    } else {
      console.warn('No articles found in response')
      return []
    }

  } catch (error) {
    console.error('Network error fetching news:', error)
    return []
  }
}

// Add this helper function after the existing helper functions
function cleanArticleContent(body: any[]): any[] {
  if (!Array.isArray(body)) return body

  return body.filter(block => {
    // Handle different block structures
    let content = ''
    
    if (block.data?.content) {
      content = block.data.content.toLowerCase()
    } else if (block.content) {
      content = block.content.toLowerCase()
    } else if (block.type === 'link') {
      // Remove all link blocks entirely
      console.log(`🔗 Removing link block: "${block.data?.text || 'unknown link'}"`)
      return false
    }

    if (!content) return true

    // Remove betting/gambling related content (comprehensive list)
    const bettingKeywords = [
      'vinn opptil',
      'win up to',
      'livescore bet',
      'livescore 6',
      'spill på',
      'bet on',
      'back rayo vallecano to win',
      'recommended bet',
      'odds are available',
      'latest odds',
      'both teams to score',
      'begge lag til å score',
      'vilkår gjelder',
      'terms apply',
      't&cs apply',
      '18+',
      'uk/ireland residents',
      'kun for innbyggere',
      'residents only',
      'gratis spill',
      'free-to-play',
      'free play',
      'forutsi resultatet',
      'predict the score',
      'predict the result',
      'livescorebet.com',
      'livescore.com',
      'editor-link',
      'your chance to win',
      '£250,000',
      'btag=c_content'
    ]

    // Check if content contains betting keywords
    const hasBettingContent = bettingKeywords.some(keyword => 
      content.includes(keyword)
    )

    if (hasBettingContent) {
      console.log(`🚫 Removing betting content block: "${content.substring(0, 100)}..."`)
      return false
    }

    return true
  }).map(block => {
    // Clean remaining content from HTML and links
    if (block.data?.content) {
      let cleanContent = block.data.content

      // Remove all HTML links and their content
      cleanContent = cleanContent
        .replace(/<a[^>]*>.*?<\/a>/gis, '') // Remove entire <a> tags including content
        .replace(/<div[^>]*>.*?<\/div>/gis, '') // Remove div blocks
        .replace(/<span[^>]*>.*?<\/span>/gis, '') // Remove span blocks
        .replace(/https?:\/\/[^\s<>"]+/gi, '') // Remove standalone URLs
        .replace(/www\.[^\s<>"]+/gi, '') // Remove www links
        .trim()

      // Remove extra whitespace
      cleanContent = cleanContent.replace(/\s+/g, ' ').trim()

      // If content becomes empty after cleaning, filter it out
      if (!cleanContent || cleanContent.length < 5) {
        console.log(`🗑️ Removing empty content block after cleaning`)
        return null
      }

      if (cleanContent !== block.data.content) {
        console.log(`🧹 Cleaned content in block: "${block.type || 'unknown'}"`)
      }

      return {
        ...block,
        data: {
          ...block.data,
          content: cleanContent
        }
      }
    }

    return block
  }).filter(block => block !== null) // Remove null blocks
}

// Update the translateArticle function to use the cleaning function
async function translateArticle(article: NewsItem): Promise<TranslatedContent | null> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not found')
    return null
  }

  try {
    console.log(`🔄 Starting translation for article: "${article.title.substring(0, 50)}..."`)

    // Clean the article body before translation
    const cleanedBody = cleanArticleContent(article.body || [])
    console.log(`🧹 Cleaned article body: ${(article.body || []).length} → ${cleanedBody.length} blocks`)

    // Prepare the content for translation
    const contentToTranslate = {
      title: article.title,
      subtitle: article.subtitle || null,
      seo_title: article.seo?.title || article.title,
      seo_description: article.seo?.description || article.subtitle || '',
      body: cleanedBody
    }

    console.log(`📝 Content prepared for translation - Body blocks: ${contentToTranslate.body.length}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in sports journalism. You must respond ONLY with valid JSON. 

Translate the following English football/soccer article content to Norwegian (Bokmål). 

Instructions:
- Maintain the original meaning and tone
- Use appropriate Norwegian football terminology
- Keep the same structure for the body content
- For the seo_slug, create a Norwegian URL-friendly slug (lowercase, hyphens, no special characters)
- Preserve any HTML tags or formatting in the body content
- If subtitle is null, keep it as null

Return ONLY a JSON object with these exact keys:
{
  "nb_title": "Norwegian translation of the title",
  "nb_subtitle": "Norwegian translation of the subtitle or null",
  "nb_seo_title": "Norwegian SEO-optimized title",
  "nb_seo_description": "Norwegian SEO description",
  "nb_seo_slug": "norwegian-url-slug",
  "nb_body": "Translated body content maintaining original structure"
}`
          },
          {
            role: 'user',
            content: `Translate this article content to Norwegian JSON format:\n\n${JSON.stringify(contentToTranslate, null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      })
    })

    console.log(`🤖 OpenAI API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OpenAI API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error details: ${errorText}`)
      return null
    }

    const result = await response.json()
    
    if (result.choices?.[0]?.message?.refusal) {
      console.error('❌ OpenAI refused to translate:', result.choices[0].message.refusal)
      return null
    }

    console.log(`📊 OpenAI usage - Input tokens: ${result.usage?.prompt_tokens}, Output tokens: ${result.usage?.completion_tokens}`)

    // Parse the JSON response
    const translatedContent = JSON.parse(result.choices[0].message.content)
    
    console.log(`✅ Translation completed successfully`)
    console.log(`🇳🇴 Norwegian title: "${translatedContent.nb_title.substring(0, 50)}..."`)
    console.log(`🔗 Norwegian slug: "${translatedContent.nb_seo_slug}"`)
    
    return translatedContent

  } catch (error) {
    console.error(`❌ Translation error for article "${article.title.substring(0, 50)}...":`, error.message)
    return null
  }
}

async function translateArticlesInParallel(articles: NewsItem[]): Promise<Array<{article: NewsItem, translation: TranslatedContent | null}>> {
  console.log(`Starting parallel translation of ${articles.length} articles...`)
  
  // Create translation promises for all articles
  const translationPromises = articles.map(async (article) => {
    const translation = await translateArticle(article)
    return { article, translation }
  })

  // Wait for all translations to complete
  const results = await Promise.all(translationPromises)
  
  const successCount = results.filter(r => r.translation !== null).length
  console.log(`Translation completed: ${successCount}/${articles.length} successful`)
  
  return results
}

// Add this function before storeNewsArticles
async function checkForExistingArticle(supabase: any, article: NewsItem): Promise<boolean> {
  try {
    // Check by title first (most reliable)
    const { data: existingByTitle } = await supabase
      .from('news_articles')
      .select('id, title, seo_slug')
      .eq('title', article.title)
      .maybeSingle()

    if (existingByTitle) {
      console.log(`⏭️ Article already exists by title: "${article.title.substring(0, 50)}..."`)
      console.log(`   Database ID: ${existingByTitle.id}`)
      return true
    }

    // Check by SEO slug as backup
    if (article.seo?.slug) {
      const { data: existingBySlug } = await supabase
        .from('news_articles')
        .select('id, title, seo_slug')
        .eq('seo_slug', article.seo.slug)
        .maybeSingle()

      if (existingBySlug) {
        console.log(`⏭️ Article already exists by SEO slug: "${article.seo.slug}"`)
        console.log(`   Database title: "${existingBySlug.title.substring(0, 50)}..."`)
        return true
      }
    }

    // Check by LiveScore ID as final backup
    const { data: existingById } = await supabase
      .from('news_articles')
      .select('id, title')
      .eq('id', article.id)
      .maybeSingle()

    if (existingById) {
      console.log(`⏭️ Article already exists by LiveScore ID: ${article.id}`)
      console.log(`   Database title: "${existingById.title.substring(0, 50)}..."`)
      return true
    }

    return false

  } catch (error) {
    console.error(`❌ Error checking for existing article:`, error.message)
    return false // If error, assume it doesn't exist to avoid blocking
  }
}

// Add this function before mapSportsRelatedData
async function findTeamByName(teamName: string, supabaseClient: any): Promise<number | null> {
  console.log(`🔍 Looking up team: "${teamName}"`)
  
  // Step 1: Try exact match first
  const { data: exactMatch } = await supabaseClient
    .from('teams')
    .select('id, name')
    .eq('name', teamName)
    .maybeSingle()

  if (exactMatch) {
    console.log(`✅ Exact match found: "${exactMatch.name}" (ID: ${exactMatch.id})`)
    return exactMatch.id
  }

  // Step 2: Try case-insensitive match
  const { data: caseInsensitiveMatch } = await supabaseClient
    .from('teams')
    .select('id, name')
    .ilike('name', teamName)
    .maybeSingle()

  if (caseInsensitiveMatch) {
    console.log(`✅ Case-insensitive match found: "${caseInsensitiveMatch.name}" (ID: ${caseInsensitiveMatch.id})`)
    return caseInsensitiveMatch.id
  }

  // Step 3: Try fuzzy matching with common variations
  console.log(`🔄 Trying fuzzy matching for: "${teamName}"`)
  
  // Get all teams to do fuzzy matching
  const { data: allTeams } = await supabaseClient
    .from('teams')
    .select('id, name')

  if (!allTeams || allTeams.length === 0) {
    console.log(`❌ No teams found in database`)
    return null
  }

  // Normalize function for comparison
  const normalize = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
  }

  const normalizedSearchName = normalize(teamName)
  console.log(`🔄 Normalized search name: "${normalizedSearchName}"`)

  // Try different matching strategies
  for (const team of allTeams) {
    const normalizedTeamName = normalize(team.name)
    
    // Strategy 1: Contains match (handles "Tottenham" vs "Tottenham Hotspur")
    if (normalizedTeamName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedTeamName)) {
      console.log(`✅ Contains match found: "${team.name}" (ID: ${team.id})`)
      console.log(`   Search: "${normalizedSearchName}" <-> DB: "${normalizedTeamName}"`)
      return team.id
    }
  }

  // Strategy 2: Word-based matching (handles "Brighton & Hove Albion" vs "Brighton")
  const searchWords = normalizedSearchName.split(' ').filter(word => word.length > 2)
  console.log(`🔄 Search words: [${searchWords.join(', ')}]`)

  for (const team of allTeams) {
    const normalizedTeamName = normalize(team.name)
    const teamWords = normalizedTeamName.split(' ').filter(word => word.length > 2)
    
    // Check if at least 2 significant words match
    const matchingWords = searchWords.filter(word => teamWords.includes(word))
    
    if (matchingWords.length >= 2 || (matchingWords.length >= 1 && searchWords.length === 1)) {
      console.log(`✅ Word-based match found: "${team.name}" (ID: ${team.id})`)
      console.log(`   Matching words: [${matchingWords.join(', ')}]`)
      return team.id
    }
  }

  // Strategy 3: Common abbreviations and variations
  const commonVariations = {
    'manchester united': ['man united', 'man utd', 'manchester utd'],
    'manchester city': ['man city', 'manchester city fc'],
    'tottenham hotspur': ['tottenham', 'spurs'],
    'brighton & hove albion': ['brighton', 'brighton hove albion'],
    'west ham united': ['west ham', 'west ham utd'],
    'newcastle united': ['newcastle', 'newcastle utd'],
    'sheffield united': ['sheffield utd', 'sheffield'],
    'crystal palace': ['palace'],
    'wolverhampton wanderers': ['wolves', 'wolverhampton'],
    'leicester city': ['leicester'],
    'nottingham forest': ['nottingham', 'forest']
  }

  console.log(`🔄 Trying common variations...`)
  
  for (const [fullName, variations] of Object.entries(commonVariations)) {
    // Check if search name matches any variation
    if (variations.includes(normalizedSearchName) || normalizedSearchName === fullName) {
      // Look for the full name or any variation in database
      for (const team of allTeams) {
        const normalizedTeamName = normalize(team.name)
        if (normalizedTeamName === fullName || variations.includes(normalizedTeamName)) {
          console.log(`✅ Variation match found: "${team.name}" (ID: ${team.id})`)
          console.log(`   Via variation: "${normalizedSearchName}" -> "${fullName}"`)
          return team.id
        }
      }
    }
  }

  console.log(`❌ No match found for: "${teamName}"`)
  console.log(`💡 Consider adding this team to your database or updating the variations`)
  return null
}

// Add this function after findTeamByName
async function findLeagueByName(leagueName: string, supabaseClient: any): Promise<number | null> {
  console.log(`🏆 Looking up league: "${leagueName}"`)
  
  // Special case: Premier League is always English Premier League (ID: 39)
  const normalizedLeagueName = leagueName.toLowerCase().trim()
  if (normalizedLeagueName === 'premier league') {
    console.log(`✅ Premier League detected - using hardcoded ID: 39`)
    return 39
  }

  // Step 1: Try exact match first
  const { data: exactMatch } = await supabaseClient
    .from('leagues')
    .select('id, name')
    .eq('name', leagueName)
    .maybeSingle()

  if (exactMatch) {
    console.log(`✅ Exact league match found: "${exactMatch.name}" (ID: ${exactMatch.id})`)
    return exactMatch.id
  }

  // Step 2: Try case-insensitive match
  const { data: caseInsensitiveMatch } = await supabaseClient
    .from('leagues')
    .select('id, name')
    .ilike('name', leagueName)
    .maybeSingle()

  if (caseInsensitiveMatch) {
    console.log(`✅ Case-insensitive league match found: "${caseInsensitiveMatch.name}" (ID: ${caseInsensitiveMatch.id})`)
    return caseInsensitiveMatch.id
  }

  // Step 3: Try fuzzy matching with common variations
  console.log(`🔄 Trying fuzzy matching for league: "${leagueName}"`)
  
  // Get all leagues to do fuzzy matching
  const { data: allLeagues } = await supabaseClient
    .from('leagues')
    .select('id, name')

  if (!allLeagues || allLeagues.length === 0) {
    console.log(`❌ No leagues found in database`)
    return null
  }

  // Normalize function for comparison
  const normalize = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
  }

  const normalizedSearchName = normalize(leagueName)
  console.log(`🔄 Normalized league search name: "${normalizedSearchName}"`)

  // Try different matching strategies
  for (const league of allLeagues) {
    const normalizedLeagueName = normalize(league.name)
    
    // Strategy 1: Contains match
    if (normalizedLeagueName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedLeagueName)) {
      console.log(`✅ League contains match found: "${league.name}" (ID: ${league.id})`)
      console.log(`   Search: "${normalizedSearchName}" <-> DB: "${normalizedLeagueName}"`)
      return league.id
    }
  }

  // Strategy 2: Word-based matching
  const searchWords = normalizedSearchName.split(' ').filter(word => word.length > 2)
  console.log(`🔄 League search words: [${searchWords.join(', ')}]`)

  for (const league of allLeagues) {
    const normalizedLeagueName = normalize(league.name)
    const leagueWords = normalizedLeagueName.split(' ').filter(word => word.length > 2)
    
    // Check if at least 2 significant words match, or 1 word if it's a unique identifier
    const matchingWords = searchWords.filter(word => leagueWords.includes(word))
    
    if (matchingWords.length >= 2 || (matchingWords.length >= 1 && searchWords.length === 1)) {
      console.log(`✅ League word-based match found: "${league.name}" (ID: ${league.id})`)
      console.log(`   Matching words: [${matchingWords.join(', ')}]`)
      return league.id
    }
  }

  // Strategy 3: Common league abbreviations and variations
  const commonLeagueVariations = {
    'premier league': ['epl', 'english premier league', 'premier league england'],
    'champions league': ['ucl', 'uefa champions league', 'european cup'],
    'europa league': ['uel', 'uefa europa league'],
    'conference league': ['uecl', 'uefa conference league'],
    'fa cup': ['english fa cup', 'football association cup'],
    'carabao cup': ['efl cup', 'league cup', 'capital one cup'],
    'serie a': ['italian serie a', 'serie a italy'],
    'la liga': ['spanish la liga', 'primera division', 'laliga'],
    'bundesliga': ['german bundesliga', 'bundesliga germany'],
    'ligue 1': ['french ligue 1', 'ligue 1 france'],
    'eredivisie': ['dutch eredivisie', 'eredivisie netherlands'],
    'primeira liga': ['portuguese liga', 'liga portugal'],
    'scottish premiership': ['spfl', 'scottish premier league'],
    'championship': ['efl championship', 'english championship'],
    'league one': ['efl league one', 'english league one'],
    'league two': ['efl league two', 'english league two']
  }

  console.log(`🔄 Trying common league variations...`)
  
  for (const [fullName, variations] of Object.entries(commonLeagueVariations)) {
    // Check if search name matches any variation
    if (variations.includes(normalizedSearchName) || normalizedSearchName === fullName) {
      // Look for the full name or any variation in database
      for (const league of allLeagues) {
        const normalizedLeagueName = normalize(league.name)
        if (normalizedLeagueName === fullName || variations.includes(normalizedLeagueName)) {
          console.log(`✅ League variation match found: "${league.name}" (ID: ${league.id})`)
          console.log(`   Via variation: "${normalizedSearchName}" -> "${fullName}"`)
          return league.id
        }
      }
    }
  }

  console.log(`❌ No league match found for: "${leagueName}"`)
  console.log(`💡 Consider adding this league to your database or updating the variations`)
  return null
}

// Update the mapSportsRelatedData function to include league mapping
async function mapSportsRelatedData(sportsRelated: any[], supabaseClient: any): Promise<{
  db_hometeam: number | null,
  db_awayteam: number | null,
  db_league: number | null
}> {
  console.log(`🔍 Mapping sports related data...`)
  
  let db_hometeam = null
  let db_awayteam = null
  let db_league = null

  // Find the match data to get home/away team info
  const matchData = sportsRelated.find(item => item.type === 'match' && item.data?.entity_type === 'match')
  
  if (matchData && matchData.data) {
    const match = matchData.data
    console.log(`⚽ Found match data:`)
    console.log(`   Home: ${match.home_team?.name} (ID: ${match.home_team?.id})`)
    console.log(`   Away: ${match.away_team?.name} (ID: ${match.away_team?.id})`)
    console.log(`   Score: ${match.goal_home}-${match.goal_away}`)

    // Map home team using smart matching
    if (match.home_team?.name) {
      console.log(`🏠 Looking up home team with smart matching...`)
      db_hometeam = await findTeamByName(match.home_team.name, supabaseClient)
    }

    // Map away team using smart matching
    if (match.away_team?.name) {
      console.log(`✈️ Looking up away team with smart matching...`)
      db_awayteam = await findTeamByName(match.away_team.name, supabaseClient)
    }

    // Map league/tournament using smart matching
    if (match.tournament_season_stage?.name) {
      console.log(`🏆 Looking up league with smart matching...`)
      db_league = await findLeagueByName(match.tournament_season_stage.name, supabaseClient)
    }
  } else {
    console.log(`⚠️ No match data found in sports_related`)
  }

  // Also check for tournament data in the sports_related array
  if (!db_league) {
    const tournamentData = sportsRelated.find(item => item.type === 'tournament' && item.data?.entity_type === 'tournament')
    if (tournamentData?.data?.name) {
      console.log(`🏆 Found tournament data, looking up: "${tournamentData.data.name}"`)
      db_league = await findLeagueByName(tournamentData.data.name, supabaseClient)
    }
  }

  console.log(`📊 Mapping results:`)
  console.log(`   🏠 Home team DB ID: ${db_hometeam}`)
  console.log(`   ✈️ Away team DB ID: ${db_awayteam}`)
  console.log(`   🏆 League DB ID: ${db_league}`)

  return {
    db_hometeam,
    db_awayteam,
    db_league
  }
}

// Update the storeNewsArticles function to include time filtering
async function storeNewsArticles(supabase: any, newsItems: NewsItem[]) {
  if (!newsItems || newsItems.length === 0) {
    console.log('No news articles to store.')
    return
  }

  console.log(`🚀 Starting processing for ${newsItems.length} articles...`)

  const recordsToUpsert = []
  let blockedCount = 0
  let duplicateCount = 0
  let tooOldCount = 0
  let translationFailures = 0

  // Define blocked keywords (case-insensitive)
  const blockedKeywords = [
    'recommendations',
    'bonus',
    'bet365',
    'betting',
    'odds',
    'wager',
    'stake',
    'bookmaker',
    'sportsbook',
    'promo',
    'promotion'
  ]

  // Filter articles first
  const filteredArticles = []
  for (const item of newsItems) {
    if (!item.id || !item.title) {
      console.warn('⚠️ Skipping article due to missing id or title:', item.id)
      continue
    }

    // Only process items with entity_type "article"
    if (item.entity_type !== 'article') {
      console.log(`🚫 Skipping non-article entity: "${item.title.substring(0, 50)}..." (type: ${item.entity_type})`)
      blockedCount++
      continue
    }

    // Skip articles with betting content
    if (item.betting_content === true) {
      console.log(`🎰 Skipping betting article: "${item.title.substring(0, 50)}..."`)
      blockedCount++
      continue
    }

    const titleLower = item.title.toLowerCase()
    const isBlocked = blockedKeywords.some(keyword => titleLower.includes(keyword))
    
    if (isBlocked) {
      console.log(`🚫 Blocking article: "${item.title.substring(0, 50)}..."`)
      blockedCount++
      continue
    }

    // NEW: Check if article is recent (last 3 hours)
    if (!item.published_at) {
      console.log(`⚠️ Skipping article without published_at: "${item.title.substring(0, 50)}..."`)
      tooOldCount++
      continue
    }

    console.log(`⏰ Checking article age: "${item.title.substring(0, 50)}..." (${item.published_at})`)
    if (!isArticleRecent(item.published_at, 3)) {
      console.log(`🕐 Skipping old article: "${item.title.substring(0, 50)}..."`)
      tooOldCount++
      continue
    }
    console.log(`✅ Article is recent (within 3 hours)`)

    // Check if article already exists in database
    console.log(`🔍 Checking if article already exists: "${item.title.substring(0, 50)}..."`)
    const alreadyExists = await checkForExistingArticle(supabase, item)
    
    if (alreadyExists) {
      duplicateCount++
      continue
    }

    console.log(`✅ Article is NEW and RECENT: "${item.title.substring(0, 50)}..."`)
    filteredArticles.push(item)
  }

  console.log(`📊 FILTERING RESULTS:`)
  console.log(`   📥 Total from API: ${newsItems.length}`)
  console.log(`   🚫 Blocked (betting/non-article): ${blockedCount}`)
  console.log(`   🕐 Too old (>3 hours): ${tooOldCount}`)
  console.log(`   ⏭️ Duplicates skipped: ${duplicateCount}`)
  console.log(`   ✅ New recent articles to process: ${filteredArticles.length}`)

  if (filteredArticles.length === 0) {
    console.log(`⚠️ No new recent articles to process - all were duplicates, blocked, or too old`)
    return
  }

  // TEMPORARY: Limit to 3 articles for testing
  const articlesToProcess = filteredArticles.slice(0, 3)
  console.log(`🧪 Processing ${articlesToProcess.length} new recent articles (limited from ${filteredArticles.length})`)

  // Translate articles in parallel with concurrency limit
  const BATCH_SIZE = 5 // Process 5 translations at a time to avoid rate limits
  const translationResults = new Map()

  for (let i = 0; i < articlesToProcess.length; i += BATCH_SIZE) {
    const batch = articlesToProcess.slice(i, i + BATCH_SIZE)
    console.log(`🔄 Processing translation batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(articlesToProcess.length/BATCH_SIZE)} (${batch.length} articles)`)
    
    const batchPromises = batch.map(async (article) => {
      const translation = await translateArticle(article)
      return { articleId: article.id, translation }
    })

    const batchResults = await Promise.all(batchPromises)
    
    for (const result of batchResults) {
      translationResults.set(result.articleId, result.translation)
    }

    // Add delay between batches to respect rate limits
    if (i + BATCH_SIZE < articlesToProcess.length) {
      console.log(`⏳ Waiting ${API_CALL_DELAY_MS}ms before next batch...`)
      await delay(API_CALL_DELAY_MS)
    }
  }

  console.log(`🎯 Translation process completed. Processing results...`)

  // Process all articles with their translations and images in parallel
  for (const item of articlesToProcess) {
    const translation = translationResults.get(item.id)
    
    console.log(`📝 Processing article: "${item.title.substring(0, 50)}..."`)

    // Process images in parallel with translation processing
    const processedArticle = await processArticleImages(item, supabase)

    // NEW: Map sports related data to database IDs
    const sportsMapping = await mapSportsRelatedData(item.sports_related || [], supabase)

    // Store article in database
    const articleData = {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      published_at: item.published_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      custom_author: item.custom_author || null,
      image_url: item.image?.data?.url || null,
      seo_title: item.seo?.title || item.title,
      seo_description: item.seo?.description || item.subtitle || '',
      seo_slug: item.seo?.slug || null,
      
      // Norwegian translations
      nb_title: translation?.nb_title || null,
      nb_subtitle: translation?.nb_subtitle || null,
      nb_body: translation?.nb_body || null,
      nb_seo_title: translation?.nb_seo_title || null,
      nb_seo_description: translation?.nb_seo_description || null,
      nb_seo_slug: translation?.nb_seo_slug || null,
      nb_translated: translation !== null,
      nb_translated_at: translation ? new Date().toISOString() : null,
      
      // Content fields
      body: item.body || [],
      image_data: item.image || null,
      
      // URLs
      canonical_url: item.urls?.canonical_url || null,
      external_url: item.urls?.external_url || null,
      public_url_desktop: item.urls?.public_url_desktop || null,
      public_url_mobile: item.urls?.public_url_mobile || null,
      public_url_amp: item.urls?.public_url_amp || null,
      
      // Category information
      category_id: item.category?.id || null,
      category_title: item.category?.title || null,
      
      // Author information
      author_id: item.created_by?.id || null,
      author_full_name: item.created_by?.full_name || null,
      
      // Content flags
      adult_content: item.adult_content || false,
      betting_content: item.betting_content || false,
      sensitive_content: item.sensitive_content || false,
      run_ads: item.run_ads !== false,
      is_live: item.live || false,
      important: item.important || false,
      
      // Sports related data
      sports_related: item.sports_related || [],
      
      // NEW: Mapped database IDs
      db_hometeam: sportsMapping.db_hometeam,
      db_awayteam: sportsMapping.db_awayteam,
      db_league: sportsMapping.db_league,
      
      // Additional metadata
      published_regions: item.published_regions?.map(r => r.slug || r.name) || [],
      published_channels: item.published_channels || [],
      
      // Generated image URL
      generated_image_url: processedArticle.main_media?.[0]?.generated_url || null,
    }

    console.log(`💾 Storing article in database...`)
    console.log(`🖼 Generated image URL: ${articleData.generated_image_url || 'None'}`)
    console.log(`⚽ Teams mapped - Home: ${articleData.db_hometeam}, Away: ${articleData.db_awayteam}`)

    const { error: insertError } = await supabase
      .from('news_articles')
      .upsert(articleData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (insertError) {
      console.error(`❌ Database insert error for article ${item.id}:`, insertError.message)
      translationFailures++
    } else {
      console.log(`✅ Article stored successfully: "${item.title.substring(0, 50)}..."`)
      if (articleData.generated_image_url) {
        console.log(`🎨 With generated image: ${articleData.generated_image_url}`)
      }
    }
  }

  if (translationFailures > 0) {
    console.log(`Translation failures: ${translationFailures}`)
  }
}

// Update to use OpenAI Responses API with direct image URL
async function analyzeImageWithOpenAI(imageUrl: string): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OpenAI API key not found')
    return null
  }

  try {
    console.log(`👁️ Analyzing original image with OpenAI Responses API...`)
    console.log(`🔗 Image URL: ${imageUrl}`)

    const requestBody = {
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text", 
              text: `Analyze this sports image in detail. Describe:
              - The sport being played
              - Colors and lighting
              - Camera angle and composition
              - People, players, or athletes present
              - Equipment visible
              - Stadium/venue details
              - Action or moment captured
              - Overall mood and atmosphere
              
              Create a detailed, vivid description that could be used to generate a similar high-quality sports photograph. Focus on visual elements, not text or logos.`
            },
            {
              type: "input_image",
              image_url: imageUrl
            }
          ]
        }
      ],
      max_output_tokens: 500
    }

    console.log(`🚀 Sending image analysis request to OpenAI Responses API...`)
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`📡 OpenAI Responses API Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OpenAI Responses API Error: ${response.status} - ${errorText}`)
      return null
    }

    const result = await response.json()
    console.log(`📋 Response structure:`, {
      id: result.id,
      status: result.status,
      hasOutput: !!result.output,
      outputLength: Array.isArray(result.output) ? result.output.length : 0
    })
    
    if (result.output && result.output[0] && result.output[0].content && result.output[0].content[0]) {
      const description = result.output[0].content[0].text
      console.log(`✅ OpenAI Vision analysis complete`)
      console.log(`📝 Generated description: "${description.substring(0, 200)}..."`)
      return description
    } else {
      console.error('❌ No description in OpenAI response')
      console.error('📋 Full response:', JSON.stringify(result, null, 2))
      return null
    }

  } catch (error) {
    console.error(`❌ Error analyzing image with OpenAI:`, error.message)
    return null
  }
}

// Update generateNewImageWithStability to use OpenAI description
async function generateNewImageWithStability(detailedDescription: string): Promise<string | null> {
  // Try environment variable first, then fallback to hardcoded
  let STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
  
  if (!STABILITY_API_KEY) {
    console.log('⚠️ Environment variable not found, using hardcoded API key')
    STABILITY_API_KEY = 'sk-gFPBpg9ZYdFJF9Ny9vtO4drTMBaRHJrN6xXrv4g7rrnJSaUT'
  } else {
    console.log('✅ Using environment Stability API key')
  }

  console.log(`🔑 Using API key: ${STABILITY_API_KEY.substring(0, 10)}...${STABILITY_API_KEY.substring(STABILITY_API_KEY.length - 4)}`)

  try {
    console.log(`🎨 Preparing Stability AI request with detailed description...`)

    // Use the detailed description from OpenAI Vision
    const prompt = `Professional sports photography: ${detailedDescription}. 
    High-quality, photorealistic, sharp focus, professional lighting, 
    no visible text or logos, suitable for premium sports news website.`

    console.log(`📝 Using detailed prompt: "${prompt.substring(0, 150)}..."`)

    // Create form data for the request
    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('aspect_ratio', '16:9')
    formData.append('output_format', 'png')
    formData.append('style_preset', 'photographic')
    formData.append('negative_prompt', 'text, logos, writing, numbers, team names, jerseys with text, blurry, low quality, cartoon, anime')

    console.log(`🚀 Sending request to Stability AI Ultra...`)

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'image/*',
        'User-Agent': 'Supabase-Edge-Function'
      },
      body: formData
    })

    console.log(`📡 Stability AI Response Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Stability AI Error Response:`)
      console.error(`   Status: ${response.status} ${response.statusText}`)
      console.error(`   Body: ${errorText}`)
      return null
    }

    // Get the image as a blob
    const imageBlob = await response.blob()
    console.log(`✅ Stability AI generated image (${Math.round(imageBlob.size / 1024)} KB)`)
    
    // Convert blob to URL for upload
    const imageUrl = URL.createObjectURL(imageBlob)
    console.log(`🔗 Created blob URL for generated image`)
    
    return imageUrl

  } catch (error) {
    console.error(`❌ Exception during Stability AI image generation:`, error.message)
    console.error(`📋 Error stack:`, error.stack)
    return null
  }
}

// Update processArticleImages to use direct URL (no need to download/encode)
async function processArticleImages(article: NewsItem, supabaseClient: any): Promise<NewsItem> {
  console.log(`🔍 Checking for images in article: "${article.title.substring(0, 50)}..."`)
  
  // Find the largest image URL from the image.data.urls structure
  let imageUrl = null
  
  if (article.image?.data?.urls?.uploaded) {
    const urls = article.image.data.urls.uploaded
    imageUrl = urls.original || urls.gallery || urls.embed || urls.thumbnail
    console.log(`📷 Found image URL: ${imageUrl}`)
  }

  if (!imageUrl) {
    console.log(`❌ No usable image URL found for article: "${article.title.substring(0, 50)}..."`)
    return article
  }

  console.log(`🔄 Starting enhanced image processing pipeline...`)
  
  // Step 1: Analyze image with OpenAI Vision (using direct URL)
  console.log(`👁️ Step 1: Analyzing image with OpenAI Responses API...`)
  const detailedDescription = await analyzeImageWithOpenAI(imageUrl)
  
  if (!detailedDescription) {
    console.log(`❌ Step 1 failed: OpenAI Vision analysis failed`)
    return article
  }
  console.log(`✅ Step 1 completed: Detailed description generated`)

  // Step 2: Generate new image with Stability using detailed description
  console.log(`🎨 Step 2: Generating new image with Stability AI...`)
  const newImageUrl = await generateNewImageWithStability(detailedDescription)
  
  if (!newImageUrl) {
    console.log(`❌ Step 2 failed: Stability AI image generation failed`)
    return article
  }
  console.log(`✅ Step 2 completed: New image generated by Stability AI`)

  // Step 3: Upload to Supabase storage
  console.log(`☁️ Step 3: Uploading to Supabase storage...`)
  const fileName = `${article.id}_${Date.now()}.png`
  console.log(`📁 Using filename: ${fileName}`)
  
  const supabaseImageUrl = await uploadImageToSupabase(newImageUrl, fileName, supabaseClient)
  
  if (!supabaseImageUrl) {
    console.log(`❌ Step 3 failed: Supabase upload failed`)
    return article
  }
  console.log(`✅ Step 3 completed: Image uploaded to Supabase`)

  console.log(`🎯 ✨ ENHANCED IMAGE PROCESSING COMPLETE ✨`)
  console.log(`   Original: ${imageUrl}`)
  console.log(`   Generated: ${supabaseImageUrl}`)
  
  // Return article with processed image info
  return {
    ...article,
    main_media: [{
      resource_type: 'image',
      resource_id: 'stability_generated',
      description: detailedDescription,
      original_url: imageUrl,
      generated_url: supabaseImageUrl,
      processed: true
    }]
  }
}

// Update uploadImageToSupabase for PNG from Stability
async function uploadImageToSupabase(imageUrl: string, fileName: string, supabaseClient: any): Promise<string | null> {
  try {
    console.log(`📤 Uploading image to Supabase: ${fileName}`)
    
    // Download the generated image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`❌ Failed to download generated image: ${response.status}`)
      return null
    }

    const imageBlob = await response.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    
    console.log(`📊 Image blob size: ${Math.round(arrayBuffer.byteLength / 1024)} KB`)
    
    // Upload to Supabase storage
    const { data, error } = await supabaseClient.storage
      .from('article-images')
      .upload(`generated/${fileName}`, arrayBuffer, {
        contentType: 'image/png', // Stability returns PNG
        upsert: true
      })

    if (error) {
      console.error('❌ Supabase storage upload error:', error.message)
      console.error('❌ Error details:', error)
      return null
    }

    console.log(`📁 Upload successful, path: ${data.path}`)

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from('article-images')
      .getPublicUrl(`generated/${fileName}`)

    console.log(`✅ Image uploaded successfully: ${publicUrlData.publicUrl}`)
    return publicUrlData.publicUrl

  } catch (error) {
    console.error(`❌ Error uploading image to Supabase:`, error.message)
    console.error(`❌ Error stack:`, error.stack)
    return null
  }
}

// --- Main Function Handler ---
serve(async (req) => {
  try {
    // Validate environment variables
    if (!RAPIDAPI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required environment variables')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('Starting news articles fetch and translation...')

    // Fetch news articles
    const newsItems = await fetchNewsArticles(RAPIDAPI_KEY)
    
    if (newsItems.length > 0) {
      // Store the articles (with translation)
      await storeNewsArticles(supabaseAdmin, newsItems)
    }

    console.log(`News fetch and translation complete. Processed ${newsItems.length} articles.`)

    return new Response(JSON.stringify({
      success: true,
      message: `News fetch and translation completed successfully!`,
      articlesProcessed: newsItems.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing news articles:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})