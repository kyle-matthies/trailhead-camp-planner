import { useContext } from "react";
import { TripContext } from "@/context/trip-context";

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
