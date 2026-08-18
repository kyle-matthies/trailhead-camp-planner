import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TreePine, Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

const publicLinks = [
  { to: "/demo", label: "Demo" },
  { to: "/gear", label: "Gear Guide" },
  { to: "/learn", label: "Learn" },
];

const authLinks = [
  { to: "/trips", label: "My Trips" },
  { to: "/my-gear", label: "My Gear" },
  { to: "/chat", label: "Assistant" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [...publicLinks, ...(isAuthenticated ? authLinks : [])];

  async function handleLogout() {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-forest-100 rounded-lg group-hover:bg-forest-200 transition-colors">
              <TreePine className="w-5 h-5 text-forest-600" />
            </div>
            <span className="text-lg font-heading font-bold text-forest-800">
              Trailhead Camp Planner
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith(link.to)
                    ? "bg-forest-100 text-forest-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm text-stone-500 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-outline px-3 py-2 text-sm"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </button>
              </div>
            ) : isSupabaseConfigured ? (
              <div className="ml-3 flex items-center gap-2">
                <Link to="/login" className="btn-outline px-4 py-2 text-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-sm">
                  Sign Up
                </Link>
              </div>
            ) : (
              <Link to="/demo" className="btn-primary ml-3 px-4 py-2 text-sm">
                Open Demo
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith(link.to)
                    ? "bg-forest-100 text-forest-700"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2 text-sm text-stone-500">
                  Signed in as {user?.name}
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </>
            ) : isSupabaseConfigured ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block btn-primary px-4 py-2.5 text-sm text-center mt-2"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <Link
                to="/demo"
                onClick={() => setMobileOpen(false)}
                className="block btn-primary px-4 py-2.5 text-sm text-center mt-2"
              >
                Open Demo
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
