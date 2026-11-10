/**
 * Demo role-based access for the hackathon.
 *
 * Staff spaces are unlocked with a per-role demo access code and the session
 * is kept in this browser only. This shows the access model (who sees what);
 * it is NOT real security — production would use Ministry accounts (e.g. via
 * DHIS2) and phone + PIN for Relais, verified by the backend.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const ROLES = {
  moh: {
    key: "moh",
    name: "Ministère de la Santé",
    space: "Espace Ministère",
    audience: "Ministry of Health · National & district planners",
    blurb: "See vulnerability scores for every province and decide where support goes first.",
    code: "MINISTERE-2026",
    home: "/dashboard",
    // The Ministry oversees every staff space.
    allowed: ["/dashboard", "/radio", "/relay"],
  },
  relay: {
    key: "relay",
    name: "Relais Communautaire",
    space: "Espace Relais",
    audience: "Relais Communautaires · Commune de Kaya",
    blurb: "Your households for today. Record visits offline and sync when you have signal.",
    code: "RELAIS-2026",
    home: "/relay",
    allowed: ["/relay"],
  },
  radio: {
    key: "radio",
    name: "Animateur·rice radio",
    space: "Espace Radio",
    audience: "Community radio hosts · Province du Sanmatenga",
    blurb: "A ready-to-read SRH segment for your province in Mooré, French and English.",
    code: "RADIO-2026",
    home: "/radio",
    allowed: ["/radio"],
    provinceId: "15",
    provinceName: "Sanmatenga",
  },
};

export const PATH_ROLE = { "/dashboard": "moh", "/relay": "relay", "/radio": "radio" };

const STORAGE_KEY = "dama_role";

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return ROLES[value] ? value : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [roleKey, setRoleKey] = useState(readStored);

  const signIn = useCallback((key, code) => {
    const role = ROLES[key];
    if (!role) return false;
    if (String(code || "").trim().toUpperCase() !== role.code) return false;
    setRoleKey(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* storage unavailable: session lasts for this tab only */
    }
    return true;
  }, []);

  const signOut = useCallback(() => {
    setRoleKey(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      role: roleKey ? ROLES[roleKey] : null,
      signIn,
      signOut,
      canAccess: (path) => Boolean(roleKey && ROLES[roleKey].allowed.some((p) => path.startsWith(p))),
    }),
    [roleKey, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
