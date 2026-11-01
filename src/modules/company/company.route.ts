import { Router } from "express";
import { requireAuth } from "../../middlewares/requiredAuth.js";
import { CompanyController } from "./company.controller.js";

const router = Router();

router.post("/onboarding", requireAuth, CompanyController.company);

export { router as CompanyRouter };
