import { Queryable } from "../../lib/database.js";
import { EmailTakenError } from "./auth.errors.js";

type CreateAnonymousSessionPayload = {
  csrfToken: string;
  expiry: Date;
};

type CreateSessionPayload = {
  csrfToken: string;
  refreshTokenHash: string;
  expiry: Date;
};

type CreateUserPayload = {
  email: string;
  passwordHash: string;
  sessionId: string;
};

export type User = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type UserWithSecrets = User & { password: string; session_id: string };

export const AuthRepository = {
  createAnonymousSession: async (
    db: Queryable,
    payload: CreateAnonymousSessionPayload,
  ): Promise<string> => {
    const result = await db.query(
      "INSERT INTO session(csrf_token, expiry) VALUES($1, $2) RETURNING id",
      [payload.csrfToken, payload.expiry],
    );

    return result.rows[0].id;
  },
  createSession: async (
    db: Queryable,
    payload: CreateSessionPayload,
  ): Promise<string> => {
    if (
      !payload ||
      !payload.csrfToken ||
      !payload.expiry ||
      !payload.refreshTokenHash
    ) {
      throw new Error("Failed to create session. Fields missing in payload");
    }
    const result = await db.query(
      "INSERT INTO session(csrf_token, refresh_token, expiry) VALUES($1, $2, $3) RETURNING id",
      [payload.csrfToken, payload.refreshTokenHash, payload.expiry],
    );

    return result.rows[0].id;
  },
  createUser: async (
    db: Queryable,
    payload: CreateUserPayload,
  ): Promise<User> => {
    if (
      !payload ||
      !payload.email ||
      !payload.passwordHash ||
      !payload.sessionId
    ) {
      throw new Error("Failed to create user. Fields missing in payload");
    }

    try {
      const result = await db.query(
        "INSERT INTO users(email, password, session_id, role) VALUES($1, $2, $3, $4) RETURNING id, email, role",
        [payload.email, payload.passwordHash, payload.sessionId, "USER"],
      );
      return result.rows[0];
    } catch (error) {
      // 23505 = unique_violation (duplicate email)
      if ((error as { code?: string }).code === "23505") {
        throw new EmailTakenError();
      }
      throw error;
    }
  },
  deleteSession: async (db: Queryable, id: string) => {
    await db.query("DELETE FROM session WHERE id = $1", [id]);
  },
  findUserByEmail: async (
    db: Queryable,
    email: string,
  ): Promise<UserWithSecrets | null> => {
    if (!email) throw new Error("Failed to get user. No email provided");

    const result = await db.query(
      "SELECT id, email, password, role, session_id FROM users WHERE email = $1",
      [email],
    );

    return result.rows[0] ?? null;
  },
  updateUserSession: async (
    db: Queryable,
    userId: string,
    sessionId: string,
  ): Promise<void> => {
    if (!userId || !sessionId)
      throw new Error("Failed to update user session. Incomplete payload");

    await db.query("UPDATE users SET session_id = $1 WHERE id = $2", [
      sessionId,
      userId,
    ]);
  },
  
};
