import bcrypt from "bcrypt";
import { generateCSRF } from "../../utils/generate-csrf.js";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { ANON_SESSION_TTL_MS } from "../../config/constants.js";
import { pool } from "../../lib/database.js";
import { withTransaction } from "../../lib/transactions.js";
import { AuthRepository } from "./auth.repository.js";
import { hashToken } from "../../utils/hash-token.js";
import { generateAccessToken } from "../../utils/generate-access-token.js";
import { generateSessionToken } from "../../utils/generate-session-token.js";
import { InvalidCredentialsError } from "./auth.errors.js";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-passord", 12);

type RegisterInput = {
  email: string;
  password: string;
  tempSessionId: string;
};

type LoginInput = {
  email: string;
  password: string;
  tempSessionId: string;
};

type LogoutInput = {
  sessionId: string;
};

export const AuthServices = {
  getCsrfToken: async () => {
    const csrfToken = generateCSRF();
    const sessionId = await AuthRepository.createAnonymousSession(pool, {
      csrfToken,
      expiry: new Date(Date.now() + ANON_SESSION_TTL_MS),
    });

    return {
      csrfToken,
      sessionToken: generateSessionToken(sessionId, ANON_SESSION_TTL_MS),
    };
  },
  register: async ({ email, password, tempSessionId }: RegisterInput) => {
    const hashedPassword = await bcrypt.hash(password, 12);
    const csrfToken = generateCSRF();
    const refreshToken = randomBytes(32).toString("base64url");
    const expiry = new Date(Date.now() + env.session_ttl_ms);

    const { user, sessionId } = await withTransaction(async (db) => {
      const sessionId = await AuthRepository.createSession(db, {
        csrfToken,
        refreshTokenHash: hashToken(refreshToken),
        expiry,
      });

      const user = await AuthRepository.createUser(db, {
        email,
        passwordHash: hashedPassword,
        sessionId,
      });

      await AuthRepository.deleteSession(db, tempSessionId);

      return { user, sessionId };
    });

    return {
      user,
      csrfToken,
      refreshToken,
      accessToken: generateAccessToken(user.id, user.role),
      sessionToken: generateSessionToken(sessionId, env.session_ttl_ms),
    };
  },
  login: async ({ email, password, tempSessionId }: LoginInput) => {
    const user = await AuthRepository.findUserByEmail(pool, email);
    const isValid = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_HASH,
    );
    if (!user || !isValid) throw new InvalidCredentialsError();

    const csrfToken = generateCSRF();
    const refreshToken = randomBytes(32).toString("base64url");
    const expiry = new Date(Date.now() + env.session_ttl_ms);

    const { sessionId } = await withTransaction(async (db) => {
      const sessionId = await AuthRepository.createSession(db, {
        csrfToken,
        refreshTokenHash: hashToken(refreshToken),
        expiry,
      });

      await AuthRepository.updateUserSession(db, user.id, sessionId);
      await AuthRepository.deleteSession(db, user.session_id);
      await AuthRepository.deleteSession(db, tempSessionId);

      return { sessionId };
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      csrfToken,
      refreshToken,
      accessToken: generateAccessToken(user.id, user.role),
      sessionToken: generateSessionToken(sessionId, env.session_ttl_ms),
    };
  },
  logout: async ({ sessionId }: LogoutInput) => {},
};
