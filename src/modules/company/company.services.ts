import { withTransaction } from "../../lib/transactions.js";
import { generateAccessToken } from "../../utils/generate-access-token.js";
import { IncompleteCompanyDetails } from "./company.errors.js";
import { CompanyRepository } from "./company.repository.js";

type CompanyOnboardingInput = {
  name: string;
  cemail: string;
  address: string;
  userId: string;
  phone?: string;
};

export const CompanyServices = {
  onboarding: async ({
    name,
    cemail,
    address,
    phone,
    userId,
  }: CompanyOnboardingInput) => {
    if (!name || !cemail || !address || !userId) {
      throw new IncompleteCompanyDetails();
    }

    const { id, role, companyId } = await withTransaction(async (db) => {
      const company = await CompanyRepository.createNewCompany(db, {
        name,
        email: cemail,
        address,
        phone,
      });
      const user = await CompanyRepository.updateUserRoleAndCompanyId(db, {
        id: userId,
        companyId: company.id,
      });

      return {
        id: user.id,
        role: user.role,
        companyId: company.id,
      };
    });

    return {
      id,
      role,
      companyId,
      accessToken: generateAccessToken(id, role, companyId),
    };
  },
};
