import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageSpinner } from "@/components/ui/Spinner";
// Eager: landing + auth (first paint).
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DemoWorkspace from "@/pages/DemoWorkspace";

// Lazy: everything behind a click or auth, so the initial bundle stays small.
const Chat = lazy(() => import("@/pages/Chat"));
const Gear = lazy(() => import("@/pages/Gear"));
const LearnList = lazy(() => import("@/pages/LearnList"));
const LearnTopic = lazy(() => import("@/pages/LearnTopic"));
const MyGear = lazy(() => import("@/pages/MyGear"));
const TripsList = lazy(() => import("@/pages/TripsList"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const TripShell = lazy(() => import("@/pages/trip/TripShell"));
const TripOverview = lazy(() => import("@/pages/trip/TripOverview"));
const TripCampers = lazy(() => import("@/pages/trip/TripCampers"));
const TripSites = lazy(() => import("@/pages/trip/TripSites"));
const TripGear = lazy(() => import("@/pages/trip/TripGear"));
const TripShopping = lazy(() => import("@/pages/trip/TripShopping"));
const TripExpenses = lazy(() => import("@/pages/trip/TripExpenses"));
const TripBoard = lazy(() => import("@/pages/trip/TripBoard"));
const TripPacking = lazy(() => import("@/pages/trip/TripPacking"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/demo" element={<DemoWorkspace />} />
                <Route path="/gear" element={<Gear />} />
                <Route path="/learn" element={<LearnList />} />
                <Route path="/learn/:topicId" element={<LearnTopic />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Solo / discovery (auth) */}
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/my-gear" element={<ProtectedRoute><MyGear /></ProtectedRoute>} />

                {/* Social camping (auth) */}
                <Route path="/trips" element={<ProtectedRoute><TripsList /></ProtectedRoute>} />
                <Route path="/invite/:token" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
                <Route path="/trips/:tripId" element={<ProtectedRoute><TripShell /></ProtectedRoute>}>
                  <Route index element={<TripOverview />} />
                  <Route path="campers" element={<TripCampers />} />
                  <Route path="sites" element={<TripSites />} />
                  <Route path="gear" element={<TripGear />} />
                  <Route path="shopping" element={<TripShopping />} />
                  <Route path="expenses" element={<TripExpenses />} />
                  <Route path="board" element={<TripBoard />} />
                  <Route path="packing" element={<TripPacking />} />
                </Route>

                {/* Legacy redirect */}
                <Route path="/my-trips" element={<Navigate to="/trips" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
