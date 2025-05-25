'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ArrowLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface NewsArticleProps {
  article: {
    id: string
    title: string
    subtitle?: string
    nb_title?: string
    nb_subtitle?: string
    nb_body?: any[]
    body?: any[]
    published_at: string
    updated_at?: string
    category_title?: string
    author_full_name?: string
    custom_author?: string
    image_data?: any
    generated_image_url?: string
    nb_translated: boolean
    sports_related?: SportsRelatedItem[]
    seo_slug?: string
    nb_seo_slug?: string
    db_league?: string
  }
}

interface MatchVenue {
  id: number
  name: string
  url_image?: string
}

interface MatchReferee {
  id: number
  name: string
}

interface MatchTeam {
  id: number
  name: string
  type: string
  gender: string
  url_logo: string
}

interface MatchScore {
  half_time: number
  ordinary_time: number
  after_extra_time: number
}

interface MatchEventStatus {
  id: number
  code: string
  name: string
  type: string
  short_name: string
}

interface MatchTournamentStage {
  id: number
  cup: boolean
  name: string
  country: {
    id: number
    name: string
    url_flag: string
  }
  tournament_id: number
  tournament_season_id: number
}

interface MatchData {
  id: number
  round: string
  venue: MatchVenue
  referee: MatchReferee
  away_team: MatchTeam
  goal_away: number
  goal_home: number
  home_team: MatchTeam
  incidents: number
  away_score: MatchScore
  home_score: MatchScore
  start_time: string
  started_at?: string
  entity_type: string
  finished_at?: string
  event_status: MatchEventStatus
  lineup_available: boolean
  tournament_season_stage: MatchTournamentStage
}

interface SportsRelatedItem {
  data: any
  type: string
  provider: string
}

interface RelatedArticle {
  id: string
  title: string
  nb_title?: string
  subtitle?: string
  nb_subtitle?: string
  published_at: string
  generated_image_url?: string
  seo_slug?: string
  nb_seo_slug?: string
  nb_translated: boolean
}

function extractMatchData(sportsRelated: SportsRelatedItem[]): MatchData | null {
  if (!sportsRelated || !Array.isArray(sportsRelated)) return null
  
  const matchItem = sportsRelated.find(item => item.type === 'match')
  return matchItem?.data || null
}

function MatchSummaryCard({ matchData }: { matchData: MatchData }) {
  if (!matchData || !matchData.home_team || !matchData.away_team || !matchData.tournament_season_stage) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finished':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'live':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finished':
        return 'Ferdig'
      case 'live':
        return 'Live'
      case 'scheduled':
        return 'Planlagt'
      default:
        return status
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-8 shadow-sm dark:shadow-lg">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-2 md:space-x-3">
          {matchData.tournament_season_stage?.country?.url_flag && (
            <img 
              src={matchData.tournament_season_stage.country.url_flag} 
              alt={matchData.tournament_season_stage.country?.name || 'Country'}
              className="w-4 h-3 md:w-6 md:h-4 object-cover rounded"
            />
          )}
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
            <span className="font-medium text-sm md:text-base text-gray-900 dark:text-white">
              {matchData.tournament_season_stage?.name || 'Unknown Tournament'}
            </span>
            {matchData.round && (
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Runde {matchData.round}
              </span>
            )}
          </div>
        </div>
        {matchData.event_status?.code && (
          <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(matchData.event_status.code)}`}>
            {getStatusText(matchData.event_status.code)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {matchData.home_team?.url_logo && (
            <img 
              src={matchData.home_team.url_logo} 
              alt={matchData.home_team?.name || 'Home team'}
              className="w-8 h-8 md:w-12 md:h-12 object-contain flex-shrink-0"
            />
          )}
          <span className="font-medium text-sm md:text-lg text-gray-900 dark:text-white truncate">
            {matchData.home_team?.name || 'Unknown Team'}
          </span>
        </div>

        <div className="flex items-center space-x-3 md:space-x-4 px-3 md:px-6 flex-shrink-0">
          <div className="text-center">
            <div className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {matchData.goal_home ?? 0} - {matchData.goal_away ?? 0}
            </div>
            {matchData.event_status?.code === 'finished' && matchData.home_score && matchData.away_score && (
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                HT: {matchData.home_score.half_time ?? 0}-{matchData.away_score.half_time ?? 0}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3 flex-1 justify-end min-w-0">
          <span className="font-medium text-sm md:text-lg text-gray-900 dark:text-white truncate">
            {matchData.away_team?.name || 'Unknown Team'}
          </span>
          {matchData.away_team?.url_logo && (
            <img 
              src={matchData.away_team.url_logo} 
              alt={matchData.away_team?.name || 'Away team'}
              className="w-8 h-8 md:w-12 md:h-12 object-contain flex-shrink-0"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700 text-xs md:text-sm">
        {matchData.start_time && (
          <div className="flex items-center space-x-1 md:space-x-2">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {formatDate(matchData.start_time)}
            </span>
          </div>
        )}
        
        {matchData.venue?.name && (
          <div className="flex items-center space-x-1 md:space-x-2">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {matchData.venue.name}
            </span>
          </div>
        )}

        {matchData.referee?.name && (
          <div className="flex items-center space-x-1 md:space-x-2">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300 truncate">
              Dommer: {matchData.referee.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function RelatedArticles({ currentArticle, language }: { currentArticle: any, language: 'nb' | 'en' }) {
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (currentArticle.db_league) {
      fetchRelatedArticles()
    }
  }, [currentArticle.db_league])

  const fetchRelatedArticles = async () => {
    if (!currentArticle.db_league) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('news_articles')
        .select(`
          id,
          title,
          nb_title,
          subtitle,
          nb_subtitle,
          published_at,
          generated_image_url,
          seo_slug,
          nb_seo_slug,
          nb_translated
        `)
        .eq('status', 'active')
        .eq('db_league', currentArticle.db_league)
        .neq('id', currentArticle.id)
        .order('published_at', { ascending: false })
        .limit(3)

      if (error) throw error

      setRelatedArticles(data || [])
    } catch (err) {
      console.error('Error fetching related articles:', err)
    } finally {
      setLoading(false)
    }
  }

  const getArticleTitle = (article: RelatedArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_title 
      ? article.nb_title 
      : article.title
  }

  const getArticleSubtitle = (article: RelatedArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_subtitle 
      ? article.nb_subtitle 
      : article.subtitle
  }

  const getArticleSlug = (article: RelatedArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_seo_slug 
      ? article.nb_seo_slug 
      : article.seo_slug || article.id
  }

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: language === 'nb' ? nb : undefined 
    })
  }

  // Don't render if no related articles or still loading
  if (!currentArticle.db_league || relatedArticles.length === 0) {
    return null
  }

  return (
    <div className="mt-16 pt-8 border-t border-gray-200 dark:border-dark-border">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === 'nb' ? 'Relaterte artikler' : 'Related articles'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedArticles.map((article) => (
          <Link 
            key={article.id} 
            href={`/news/${getArticleSlug(article)}`}
            className="group"
          >
            <article className="bg-white dark:bg-dark-nav rounded-lg shadow-md dark:shadow-lg overflow-hidden hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 border dark:border-dark-border h-full flex flex-col">
              {/* Article Image */}
              <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {article.generated_image_url ? (
                  <Image
                    src={article.generated_image_url}
                    alt={getArticleTitle(article)}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                {/* Norwegian badge */}
                {language === 'nb' && article.nb_translated && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-green-600 dark:bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                      🇳🇴
                    </span>
                  </div>
                )}
              </div>

              {/* Article Content */}
              <div className="p-4 flex flex-col flex-grow">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <time>{formatPublishedDate(article.published_at)}</time>
                </div>

                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {getArticleTitle(article)}
                </h4>

                {getArticleSubtitle(article) && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3 flex-grow">
                    {getArticleSubtitle(article)}
                  </p>
                )}

                <div className="mt-auto">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
                    {language === 'nb' ? 'Les mer →' : 'Read more →'}
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function NewsArticle({ article }: NewsArticleProps) {
  const [language, setLanguage] = useState<'nb' | 'en'>('nb')

  useEffect(() => {
    const hasNorwegianContent = article.nb_translated && (article.nb_title || article.nb_body)
    setLanguage(hasNorwegianContent ? 'nb' : 'en')
  }, [article])

  const getTitle = () => {
    return language === 'nb' && article.nb_title ? article.nb_title : article.title
  }

  const getSubtitle = () => {
    return language === 'nb' && article.nb_subtitle ? article.nb_subtitle : article.subtitle
  }

  const getBody = () => {
    return language === 'nb' && article.nb_body ? article.nb_body : article.body || []
  }

  const getAuthor = () => {
    return article.custom_author || article.author_full_name
  }

  const getMainImage = () => {
    return article.generated_image_url || null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      relative: formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: language === 'nb' ? nb : undefined 
      }),
      absolute: format(date, 'dd. MMMM yyyy, HH:mm', {
        locale: language === 'nb' ? nb : undefined
      })
    }
  }

  const renderContentBlock = (block: any, index: number) => {
    if (!block || !block.data) return null

    switch (block.type) {
      case 'editor_block':
        return renderEditorBlock(block.data, index)
      case 'link':
        return renderLinkBlock(block.data, index)
      default:
        return null
    }
  }

  const renderEditorBlock = (data: any, index: number) => {
    if (!data.content) return null

    const content = data.content

    if (data.type === 'heading') {
      return (
        <div 
          key={index}
          className="prose prose-lg dark:prose-invert max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }

    if (data.type === 'paragraph') {
      return (
        <div 
          key={index}
          className="prose prose-lg dark:prose-invert max-w-none mb-4 text-gray-700 dark:text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }

    return (
      <div 
        key={index}
        className="prose prose-lg dark:prose-invert max-w-none mb-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  const renderLinkBlock = (data: any, index: number) => {
    if (!data.link || !data.text) return null

    return (
      <div key={index} className="my-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
        <a 
          href={data.link}
          target={data.open_type === 'NEW_WINDOW' ? '_blank' : '_self'}
          rel={data.open_type === 'NEW_WINDOW' ? 'noopener noreferrer' : undefined}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
        >
          {data.text}
        </a>
      </div>
    )
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: getTitle(),
          text: getSubtitle(),
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const mainImage = getMainImage()
  const dates = formatDate(article.published_at)
  const body = getBody()

  const matchData = extractMatchData(article.sports_related || [])

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link 
          href="/news"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          {language === 'nb' ? 'Tilbake til nyheter' : 'Back to news'}
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          {article.category_title && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-medium capitalize">
              {article.category_title}
            </span>
          )}
          <time title={dates.absolute}>
            {dates.relative}
          </time>
          {language === 'nb' && article.nb_translated && (
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
              🇳🇴 Norsk
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          {getTitle()}
        </h1>

        {getSubtitle() && (
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {getSubtitle()}
          </p>
        )}

        <div className="flex items-center justify-between">
          {getAuthor() && (
            <div className="flex-1">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Av {getAuthor()}
              </div>
              
              {language === 'nb' && article.nb_translated && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Denne artikkelen er originalt skrevet av {getAuthor()} men oversatt til norsk ved hjelp av KI og gjennomgått av vårt ekspertpanel.
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-4"
          >
            <ShareIcon className="w-4 h-4" />
            {language === 'nb' ? 'Del' : 'Share'}
          </button>
        </div>
      </header>

      {mainImage && (
        <div className="relative w-full h-64 md:h-96 lg:h-[500px] mb-8 rounded-lg overflow-hidden">
          <Image
            src={mainImage}
            alt={getTitle()}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      )}

      {matchData && (
        <MatchSummaryCard matchData={matchData} />
      )}

      <div className="prose prose-lg dark:prose-invert max-w-none">
        {body.map((block, index) => renderContentBlock(block, index))}
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'nb' ? 'Publisert' : 'Published'}: {dates.absolute}
          </div>
          
          <Link 
            href="/news"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            {language === 'nb' ? 'Les flere nyheter →' : 'Read more news →'}
          </Link>
        </div>
      </footer>

      {/* Related Articles */}
      <RelatedArticles currentArticle={article} language={language} />
    </article>
  )
}