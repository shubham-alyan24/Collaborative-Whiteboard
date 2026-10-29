import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Each page is its own chunk, so a route only downloads the code it renders
const App = lazy(() => import("./App"));
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const WhiteboardPage = lazy(() => import("./pages/WhiteboardPage"));
const JoinBoard = lazy(() => import("./pages/JoinBoard"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const page = (element) => <Suspense fallback={null}>{element}</Suspense>;

const AppRouter = createBrowserRouter([
  {
    path: "/",
    element: page(<App />),
  },
  {
    path: "/login",
    element: page(<Login />),
  },
  {
    path: "/reset-password",
    element: page(<ResetPassword />),
  },
  {
    path: "/oauth/callback",
    element: page(<OAuthCallback />),
  },
  {
    path: "/home",
    element: page(
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>,
    ),
  },
  {
    path: "/whiteboard/:id",
    element: page(
      <ProtectedRoute>
        <WhiteboardPage />
      </ProtectedRoute>,
    ),
  },
  {
    path: "/join/:code",
    element: page(<JoinBoard />),
  },
  {
    path: "/settings",
    element: page(
      <ProtectedRoute>
        <AccountSettings />
      </ProtectedRoute>,
    ),
  },
]);

export default AppRouter;
