import { RoomProvider, useRoom } from "./context/RoomContext"
import HomePage from "./pages/HomePage"
import LobbyPage from "./pages/LobbyPage"
import GamePage from "./pages/GamePage"

function AppShell() {
  const { room } = useRoom()
  if (!room) return <div className="app"><HomePage /> </div>
  if (room.status === 'lobby') return <div className="app"><LobbyPage /></div>
  return <div className="app"><GamePage /></div>
}

function App() {
  return (
    <RoomProvider>
      <AppShell />
    </RoomProvider>
  )
}

export default App


