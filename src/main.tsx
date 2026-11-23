import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, RouterProvider, createHashRouter } from 'react-router';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/700.css';
import './index.css';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ResultsScreen from './screens/ResultsScreen';

// Hash routes work on any static host and from file:// with no server rewrites.
// Invalid :mode values are redirected to home by the quiz and results screens.
const router = createHashRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/quiz/:mode', element: <QuizScreen /> },
  { path: '/results/:mode', element: <ResultsScreen /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
