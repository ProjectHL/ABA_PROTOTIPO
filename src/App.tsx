import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme/index';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TeamPage from './pages/TeamPage';
import StudentsPage from './pages/StudentsPage';
import ProgramChartPage from './pages/ProgramChartPage';
import SharedAccessPage from './pages/SharedAccessPage';
import SessionPage from './pages/SessionPage';
import NotFoundPage from './pages/NotFoundPage';

import { RoleProvider } from './context/RoleContext';

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <RoleProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/shared-access" element={<SharedAccessPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:studentId" element={<StudentsPage />} />
            <Route path="/session/:studentId" element={<SessionPage />} />
            <Route path="/students/:studentId/programs/:programId/chart" element={<ProgramChartPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </RoleProvider>
    </MantineProvider>
  )
}

export default App
