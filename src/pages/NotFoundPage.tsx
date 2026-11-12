import { Link } from 'react-router'
import { StatusScreen } from '../components/StatusScreen.tsx'

export function NotFoundPage() {
  return (
    <StatusScreen title="Página não encontrada">
      <Link to="/" className="font-semibold text-ink underline underline-offset-4">
        Ir para o início
      </Link>
    </StatusScreen>
  )
}
