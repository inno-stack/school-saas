import { prisma } from "./prisma";
import { errorResponse } from "./response";

// Gets the currently active session + term for a school
// Used as a guard in result-related routes
export async function getActivePeriod(schoolId: string) {
  const [activeSession, activeTerm] = await Promise.all([
    prisma.session.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.term.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, sessionId: true },
    }),
  ]);

  if (!activeSession) {
    return {
      activePeriod: null,
      error: errorResponse(
        "No active session found. Please activate a session first.",
        400,
      ),
    };
  }

  if (!activeTerm) {
    return {
      activePeriod: null,
      error: errorResponse(
        "No active term found. Please activate a term first.",
        400,
      ),
    };
  }

  return {
    activePeriod: { session: activeSession, term: activeTerm },
    error: null,
  };
}
