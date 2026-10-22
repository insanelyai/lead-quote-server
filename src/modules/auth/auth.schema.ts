import z from "zod";

export const registerSchema = z.object({
  email: z.email().max(255),
  password: z
    .string()
    .min(8, "Password should be at least 8 characters long")
    .max(72, "Password should be at most 72 characters long"),
});

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(72),
});
