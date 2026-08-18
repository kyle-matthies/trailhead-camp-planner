import { TreePine } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-forest-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-forest-400" />
              <span className="text-lg font-heading font-bold text-white">
                Trailhead Camp Planner
              </span>
            </div>
            <p className="text-sm text-forest-300 max-w-xs">
              A permission-aware workspace for group camping plans, shared
              readiness, transparent costs, and reviewable AI suggestions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-forest-300">
              <li>
                <Link to="/demo" className="hover:text-white transition-colors">
                  Fictional Demo
                </Link>
              </li>
              <li>
                <Link to="/gear" className="hover:text-white transition-colors">
                  Gear Guide
                </Link>
              </li>
              <li>
                <Link to="/learn" className="hover:text-white transition-colors">
                  Learn
                </Link>
              </li>
            </ul>
          </div>

          {/* Project */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Project
            </h3>
            <ul className="space-y-2 text-sm text-forest-300">
              <li>
                <a
                  href="https://github.com/kyle-matthies/trailhead-camp-planner"
                  className="hover:text-white transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <Link
                  to="/demo"
                  className="hover:text-white transition-colors"
                >
                  AI Review Flow
                </Link>
              </li>
              <li>
                <Link
                  to="/demo"
                  className="hover:text-white transition-colors"
                >
                  Role Model
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-forest-800 text-center text-xs text-forest-400">
          &copy; {new Date().getFullYear()} Trailhead Camp Planner. MIT licensed.
        </div>
      </div>
    </footer>
  );
}
