import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import NewsArticle from '../../components/NewsArticle'
import { Metadata } from 'next'

interface NewsArticleData {
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
  seo_title?: string
  nb_seo_title?: string
  seo_description?: string
  nb_seo_description?: string
  sports_related?: any[]
  seo_slug?: string
  nb_seo_slug?: string
  db_league?: string
  db_hometeam?: number
  db_awayteam?: number
}

interface PageProps {
  params: {
    slug: string
  }
}

async function getArticle(slug: string): Promise<NewsArticleData | null> {
  const supabase = createServerComponentClient({ cookies })
  
  const { data, error } = await supabase
    .from('news_articles')
    .select(`
      id,
      title,
      subtitle,
      nb_title,
      nb_subtitle,
      nb_body,
      body,
      published_at,
      updated_at,
      category_title,
      author_full_name,
      custom_author,
      image_data,
      generated_image_url,
      nb_translated,
      seo_title,
      nb_seo_title,
      seo_description,
      nb_seo_description,
      sports_related,
      seo_slug,
      nb_seo_slug,
      db_league,
      db_hometeam,
      db_awayteam
    `)
    .or(`seo_slug.eq.${slug},nb_seo_slug.eq.${slug}`)
    .eq('status', 'active')
    .single()

  if (error) {
    console.error('Error fetching article:', error)
    return null
  }

  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticle(params.slug)
  
  if (!article) {
    return {
      title: 'Artikkel ikke funnet | ViaScore',
      description: 'Den forespurte artikkelen kunne ikke finnes.',
    }
  }

  // Determine if this is a Norwegian article based on slug or translation status
  const isNorwegian = article.nb_translated && (
    article.nb_seo_title || article.nb_title
  )

  const title = isNorwegian && article.nb_seo_title 
    ? article.nb_seo_title 
    : article.seo_title || (isNorwegian ? article.nb_title : article.title)
    
  const description = isNorwegian && article.nb_seo_description
    ? article.nb_seo_description
    : article.seo_description || (isNorwegian ? article.nb_subtitle : article.subtitle)

  return {
    title: `${title} | ViaScore`,
    description: description || 'Les de siste fotballnyhetene på ViaScore',
    openGraph: {
      title,
      description: description || 'Les de siste fotballnyhetene på ViaScore',
      type: 'article',
      publishedTime: article.published_at,
      modifiedTime: article.updated_at || article.published_at,
      authors: article.author_full_name ? [article.author_full_name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || 'Les de siste fotballnyhetene på ViaScore',
    },
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const article = await getArticle(params.slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-main transition-colors">
      <NewsArticle article={article} />
    </div>
  )
}