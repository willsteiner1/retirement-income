import { PlanProvider } from './context/PlanContext'
import { AppShell } from './components/layout/AppShell'

function App() {
  return (
    <PlanProvider>
      <AppShell />
    </PlanProvider>
  )
}

export default App
