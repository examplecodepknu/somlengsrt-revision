import { StoreProvider, useStore } from './store'
import { Layout } from './Layout'
import { Toasts } from './ui'
import { Studio } from './pages/Studio'
import { MyVoices } from './pages/MyVoices'
import { StudioNew } from './pages/StudioNew'
import { Projects } from './pages/Projects'
import { ProjectsNew } from './pages/ProjectsNew'
import { VoicesNew } from './pages/VoicesNew'
import { Placeholder } from './pages/Other'
import { ApiTokensNew, BuyTokensNew, DashboardNew, McpNew, RedeemNew, SubscriptionsNew, TokenHistoryNew, TranscribeNew } from './pages/PlatformNew'
import { ApiTokens, BuyTokens, Dashboard, Mcp, Redeem, Subscriptions, TokenHistory, Transcribe } from './pages/Platform'

function Router() {
  const { page } = useStore()
  if (page === 'projects' || page === 'somlengpit') return <Projects />
  if (page === 'projects-new') return <ProjectsNew />
  if (page === 'studio') return <Studio />
  if (page === 'studio-new') return <StudioNew />
  if (page === 'voices-new') return <VoicesNew />
  if (page === 'voices') return <MyVoices />
  if (page === 'buy') return <BuyTokens />
  if (page === 'history-new') return <TokenHistoryNew />
  if (page === 'dashboard-new') return <DashboardNew />
  if (page === 'transcribe-new') return <TranscribeNew />
  if (page === 'subscriptions-new') return <SubscriptionsNew />
  if (page === 'redeem-new') return <RedeemNew />
  if (page === 'api-new') return <ApiTokensNew />
  if (page === 'mcp-new') return <McpNew />
  if (page === 'buy-new') return <BuyTokensNew />
  if (page === 'somlengpit-new') return <ProjectsNew />
  if (page === 'history') return <TokenHistory />
  if (page === 'dashboard') return <Dashboard />
  if (page === 'transcribe') return <Transcribe />
  if (page === 'subscriptions') return <Subscriptions />
  if (page === 'redeem') return <Redeem />
  if (page === 'api') return <ApiTokens />
  if (page === 'mcp') return <Mcp />
  return <Placeholder page={page} />
}

export default function App() {
  return (
    <StoreProvider>
      <Layout><Router /></Layout>
      <Toasts />
    </StoreProvider>
  )
}
