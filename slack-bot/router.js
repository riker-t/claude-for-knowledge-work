// Content-based message router — regex classification, no AI cost
// Returns route config: { name, maxTurns, timeout, priority }

const ROUTES = [
  {
    name: "skill-invoke",
    test: (prompt) => /^\/\S+/.test(prompt),
    maxTurns: 30,
    timeout: 20 * 60_000, // 20 min
    priority: 1,
  },
  {
    name: "standard",
    test: () => true, // fallback — all non-skill DM messages
    maxTurns: 30,
    timeout: 20 * 60_000, // 20 min
    priority: 2,
  },
];

const RESTRICTED_ROUTE = {
  name: "restricted",
  maxTurns: 30,
  timeout: 20 * 60_000, // 20 min
  priority: 2,
};

const SCHEDULED_ROUTE = {
  name: "scheduled",
  maxTurns: 30,
  timeout: 15 * 60_000, // 15 min
  priority: 0, // lowest — interactive always wins
};

export function classify(prompt, mode = "full") {
  if (mode === "restricted") return RESTRICTED_ROUTE;
  if (mode === "scheduled") return SCHEDULED_ROUTE;

  for (const route of ROUTES) {
    if (route.test(prompt)) {
      return { name: route.name, maxTurns: route.maxTurns, timeout: route.timeout, priority: route.priority };
    }
  }
  return ROUTES[ROUTES.length - 1];
}
