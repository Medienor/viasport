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
  generated_image_url?: string
  seo_slug?: string
  nb_seo_slug?: string
  nb_translated: boolean
  category_title?: string
}

interface FixtureNewsProps {
  leagueId: number
  leagueName?: string
  isFinished?: boolean
}

export default function FixtureNews({ leagueId, leagueName, isFinished = false }: FixtureNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRelevantNews()
  }, [leagueId])

  const fetchRelevantNews = async () => {
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
          generated_image_url,
          seo_slug,
          nb_seo_slug,
          nb_translated,
          category_title
        `)
        .eq('status', 'active')
        .eq('db_league', leagueId.toString())

      // If match is finished, exclude predictions articles
      if (isFinished) {
        query = query.neq('category_title', 'Predictions')
      }

      const { data, error } = await query
        .order('published_at', { ascending: false })
        .limit(4)

      if (error) throw error

      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching fixture news:', err)
    } finally {
      setLoading(false)
    }
  }

  const getArticleTitle = (article: NewsArticle) => {
    return article.nb_translated && article.nb_title ? article.nb_title : article.title
  }

  const getArticleSubtitle = (article: NewsArticle) => {
    return article.nb_translated && article.nb_subtitle ? article.nb_subtitle : article.subtitle
  }

  const getArticleSlug = (article: NewsArticle) => {
    return article.nb_translated && article.nb_seo_slug ? article.nb_seo_slug : article.seo_slug
  }

  const formatPublishedDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: nb })
  }

  if (loading || articles.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-[#181818] rounded-lg border border-[#f3f4f6] dark:border-[#232323] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#f3f4f6] dark:border-[#232323]">
        <h3 className="text-[14px] font-[500] mb-0 text-gray-700 dark:text-gray-300">
          Siste nytt fra {leagueName || 'ligaen'}
        </h3>
      </div>
      
      {/* Articles Grid */}
      <div className="p-6">
        {articles.length === 1 ? (
          // Single article - full width
          <Link 
            href={`/news/${getArticleSlug(articles[0])}`}
            className="group block"
          >
            <article className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222222] transition-all duration-300">
              {/* Image */}
              <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                {articles[0].generated_image_url ? (
                  <Image
                    src={articles[0].generated_image_url}
                    alt={getArticleTitle(articles[0])}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {formatPublishedDate(articles[0].published_at)}
                </div>
                
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {getArticleTitle(articles[0])}
                </h4>

                {getArticleSubtitle(articles[0]) && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-2">
                    {getArticleSubtitle(articles[0])}
                  </p>
                )}

                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
                  Les mer →
                </span>
              </div>
            </article>
          </Link>
        ) : (
          // Multiple articles - compact list
          <div className="space-y-3">
            {articles.map((article, index) => (
              <Link 
                key={article.id} 
                href={`/news/${getArticleSlug(article)}`}
                className="group block"
              >
                <article className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222222] transition-all duration-300">
                  {/* Small image */}
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {article.generated_image_url ? (
                      <Image
                        src={article.generated_image_url}
                        alt={getArticleTitle(article)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPublishedDate(article.published_at)}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                      {getArticleTitle(article)}
                    </h4>

                    <div className="mt-1">
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-medium group-hover:underline">
                        Les mer →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 