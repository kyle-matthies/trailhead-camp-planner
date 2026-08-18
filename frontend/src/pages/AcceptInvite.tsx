import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, TreePine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("This invite link is invalid.");
        return;
      }
      const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("ok");
      const tripId = data?.trip_id;
      setTimeout(() => navigate(tripId ? `/trips/${tripId}` : "/trips"), 1200);
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-sand-50 to-forest-50 px-4">
      <div className="w-full max-w-md card p-8 text-center">
        <div className="inline-flex p-2 bg-forest-100 rounded-lg mb-4">
          <TreePine className="w-6 h-6 text-forest-600" />
        </div>

        {status === "loading" && (
          <>
            <h1 className="text-xl font-heading font-bold text-stone-900 mb-4">Joining the camp…</h1>
            <PageSpinner />
          </>
        )}

        {status === "ok" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-forest-600 mx-auto mb-3" />
            <h1 className="text-xl font-heading font-bold text-stone-900">You're in!</h1>
            <p className="text-sm text-stone-500 mt-2">Taking you to the trip…</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h1 className="text-xl font-heading font-bold text-stone-900">Couldn't accept invite</h1>
            <p className="text-sm text-stone-600 mt-2">{message}</p>
            {user?.email && (
              <p className="text-xs text-stone-400 mt-2">
                You're signed in as {user.email}. Invites must be accepted with the email they were
                sent to.
              </p>
            )}
            <Link to="/trips" className="btn-primary px-4 py-2 text-sm mt-5 inline-block">
              Go to my trips
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
