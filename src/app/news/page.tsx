import NewsPage from '../components/NewsPage'

export default function News() {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-main transition-colors">
      <NewsPage language="nb" />
    </div>
  )
}

export const metadata = {
  title: 'Fotballnyheter | ViaScore',
  description: 'Les de siste fotballnyhetene på norsk og engelsk',
}