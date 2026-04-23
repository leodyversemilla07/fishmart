import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep stale unpaid reservations regularly so inventory is released even during low traffic.
crons.interval(
  "release-expired-order-reservations",
  { minutes: 5 },
  internal.orders.releaseExpiredReservations,
  {}
);

export default crons;
