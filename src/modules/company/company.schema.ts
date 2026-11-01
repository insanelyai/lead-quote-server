import z from "zod";

export const companyOnboarding = z.object({
  email: z.email().max(255),
  name: z.string().trim().min(1, "Company's name is required").max(255),
  address: z.string().trim().min(1, "Company's address is required"),
  phone: z.string().optional(),
});

export const companyInvite = z.object({
  email: z.email().max(255),
  name: z.string().trim().min(1, "Name is required").max(255),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});
