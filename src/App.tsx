import { PlanProvider } from './context/PlanContext'
import { AppShell } from './components/layout/AppShell'
import { FeedbackContainer } from './components/feedback'

function App() {
  return (
    <PlanProvider>
      <AppShell />
      <FeedbackContainer />
    </PlanProvider>
  )
}

export default App
