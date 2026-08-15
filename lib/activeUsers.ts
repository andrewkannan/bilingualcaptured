const globalForSessions = globalThis as unknown as {
  activeSessions: Map<string, number> | undefined
}

export const activeSessions = globalForSessions.activeSessions ?? new Map<string, number>()

if (process.env.NODE_ENV !== 'production') globalForSessions.activeSessions = activeSessions
