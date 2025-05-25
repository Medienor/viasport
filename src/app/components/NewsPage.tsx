'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'

interface NewsArticle {
  id: string
  title: string
  subtitle?: string
  nb_title?: string
  nb_subtitle?: string
  published_at: string
  category_title?: string
  author_full_name?: string
  image_data?: {
    data?: {
      urls?: {
        uploaded?: {
          embed?: string
          gallery?: string
          thumbnail?: string
        }
      }
    }
  }
  generated_image_url?: string
  seo_slug?: string
  nb_seo_slug?: string
  nb_translated: boolean
  is_prediction?: boolean
  important?: boolean
  db_hometeam?: string
  db_awayteam?: string
  db_league?: string
}

interface Team {
  id: string
  name: string
}

interface League {
  id: string
  name: string
}

interface NewsPageProps {
  language?: 'en' | 'nb'
}

export default function NewsPage({ language = 'nb' }: NewsPageProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [teams, setTeams] = useState<Map<string, Team>>(new Map())
  const [leagues, setLeagues] = useState<Map<string, League>>(new Map())

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('news_articles')
        .select(`
          id,
          title,
          subtitle,
          nb_title,
          nb_subtitle,
          published_at,
          category_title,
          author_full_name,
          image_data,
          generated_image_url,
          seo_slug,
          nb_seo_slug,
          nb_translated,
          is_prediction,
          important,
          db_hometeam,
          db_awayteam,
          db_league
        `)
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(20)

      if (selectedCategory !== 'all') {
        query = query.eq('category_title', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setArticles(data || [])
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(article => article.category_title).filter(Boolean))]
      setCategories(uniqueCategories)

      // Fetch teams and leagues data
      await fetchTeamsAndLeagues(data || [])
      
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('Failed to load news articles')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamsAndLeagues = async (articles: NewsArticle[]) => {
    try {
      // Collect all unique team and league IDs
      const teamIds = new Set<string>()
      const leagueIds = new Set<string>()

      articles.forEach(article => {
        if (article.db_hometeam) teamIds.add(article.db_hometeam)
        if (article.db_awayteam) teamIds.add(article.db_awayteam)
        if (article.db_league) leagueIds.add(article.db_league)
      })

      // Fetch teams
      if (teamIds.size > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', Array.from(teamIds))

        if (teamsData) {
          const teamsMap = new Map<string, Team>()
          teamsData.forEach(team => teamsMap.set(team.id, team))
          setTeams(teamsMap)
        }
      }

      // Fetch leagues
      if (leagueIds.size > 0) {
        const { data: leaguesData } = await supabase
          .from('leagues')
          .select('id, name')
          .in('id', Array.from(leagueIds))

        if (leaguesData) {
          const leaguesMap = new Map<string, League>()
          leaguesData.forEach(league => leaguesMap.set(league.id, league))
          setLeagues(leaguesMap)
        }
      }
    } catch (err) {
      console.error('Error fetching teams and leagues:', err)
    }
  }

  const createTeamUrl = (teamId: string) => {
    const team = teams.get(teamId)
    if (!team) return null
    const slug = team.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `/lag/${slug}-${teamId}`
  }

  const createLeagueUrl = (leagueId: string) => {
    const league = leagues.get(leagueId)
    if (!league) return null
    const slug = league.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `/liga/${slug}-${leagueId}`
  }

  const getArticleTitle = (article: NewsArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_title 
      ? article.nb_title 
      : article.title
  }

  const getArticleSubtitle = (article: NewsArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_subtitle 
      ? article.nb_subtitle 
      : article.subtitle
  }

  const getArticleSlug = (article: NewsArticle) => {
    return language === 'nb' && article.nb_translated && article.nb_seo_slug 
      ? article.nb_seo_slug 
      : article.seo_slug || article.id
  }

  const getImageUrl = (article: NewsArticle) => {
    // Use only generated_image_url
    return article.generated_image_url || null
  }

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: language === 'nb' ? nb : undefined 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-main py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-nav rounded-lg shadow-md overflow-hidden border dark:border-dark-border">
                  <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-main py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'nb' ? 'Feil ved lasting av nyheter' : 'Error loading news'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <button 
              onClick={fetchArticles}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded transition-colors"
            >
              {language === 'nb' ? 'Prøv igjen' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-main py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'nb' ? 'Fotballnyheter' : 'Football News'}
          </h1>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-white dark:bg-dark-nav text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-dark-border'
              }`}
            >
              Alle
            </button>
            {categories.map((category) => {
              // Map English categories to Norwegian
              const getCategoryLabel = (cat: string) => {
                switch (cat.toLowerCase()) {
                  case 'match reports':
                    return 'Kamprapporter'
                  case 'predictions':
                    return 'Oddstips'
                  default:
                    return cat
                }
              }

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-white dark:bg-dark-nav text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-dark-border'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {language === 'nb' ? 'Ingen artikler funnet' : 'No articles found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'nb' 
                ? 'Prøv å velge en annen kategori eller kom tilbake senere.' 
                : 'Try selecting a different category or check back later.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const imageUrl = getImageUrl(article)
              const title = getArticleTitle(article)
              const subtitle = getArticleSubtitle(article)
              const slug = getArticleSlug(article)
              
              return (
                <Link 
                  key={article.id} 
                  href={`/news/${slug}`}
                  className="group"
                >
                  <article className="bg-white dark:bg-dark-nav rounded-lg shadow-md dark:shadow-lg overflow-hidden hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 border dark:border-dark-border h-full flex flex-col">
                    {/* Article Image */}
                    <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={title}
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
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {article.important && (
                          <span className="bg-red-600 dark:bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                            {language === 'nb' ? 'Viktig' : 'Important'}
                          </span>
                        )}
                        {article.is_prediction && (
                          <span className="bg-purple-600 dark:bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                            {language === 'nb' ? 'Spådom' : 'Prediction'}
                          </span>
                        )}
                        {language === 'nb' && article.nb_translated && (
                          <span className="bg-green-600 dark:bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                            🇳🇴
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Article Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {article.category_title && (
                          <span className="capitalize font-medium text-blue-600 dark:text-blue-400">
                            {article.category_title}
                          </span>
                        )}
                        <span>•</span>
                        <time>{formatPublishedDate(article.published_at)}</time>
                      </div>

                      {/* Tags for teams and leagues */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {article.db_hometeam && teams.get(article.db_hometeam) && (
                          <span 
                            className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              const url = createTeamUrl(article.db_hometeam!)
                              if (url) window.location.href = url
                            }}
                          >
                            {teams.get(article.db_hometeam)?.name}
                          </span>
                        )}
                        {article.db_awayteam && teams.get(article.db_awayteam) && (
                          <span 
                            className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              const url = createTeamUrl(article.db_awayteam!)
                              if (url) window.location.href = url
                            }}
                          >
                            {teams.get(article.db_awayteam)?.name}
                          </span>
                        )}
                        {article.db_league && leagues.get(article.db_league) && (
                          <span 
                            className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              const url = createLeagueUrl(article.db_league!)
                              if (url) window.location.href = url
                            }}
                          >
                            {leagues.get(article.db_league)?.name}
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {title}
                      </h2>

                      {subtitle && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-3 flex-grow">
                          {subtitle}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        {article.author_full_name && article.author_full_name !== 'Livescore Admin' && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {language === 'nb' ? 'Av' : 'By'} {article.author_full_name}
                          </span>
                        )}
                        
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline ml-auto">
                          {language === 'nb' ? 'Les mer →' : 'Read more →'}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}

        {/* Load More Button */}
        {articles.length >= 20 && (
          <div className="text-center mt-12">
            <button 
              onClick={() => {
                // Implement pagination logic here
                console.log('Load more articles')
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md dark:shadow-lg"
            >
              {language === 'nb' ? 'Last flere artikler' : 'Load more articles'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}