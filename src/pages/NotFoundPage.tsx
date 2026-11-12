import { Link } from 'react-router'
import { StatusScreen } from '../components/StatusScreen.tsx'

export function NotFoundPage() {
  return (
    <StatusScreen title="Página não encontrada">
      <Link to="/" className="text-accent underline">
        Ir para o início
      </Link>
    </StatusScreen>
  )
}
