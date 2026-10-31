import { Queryable } from "../../lib/database.js";
import { User } from "../auth/auth.repository.js";
import { AlreadyOnboarded, CompanyAlreadyExist } from "./company.errors.js";

type Company = {
  name: string;
  email: string;
  address: string;
  phone?: string;
};

type UserUpdate = {
  id: string;
  companyId: string;
};

export const CompanyRepository = {
  createNewCompany: async (
    db: Queryable,
    payload: Company,
  ): Promise<Company & { id: string }> => {
    if (!payload.name || !payload.email || !payload.address) {
      throw new Error(
        "Failed to create new company.  Fields are missing in the payload",
      );
    }
    try {
      if (!payload.phone) {
        const result = await db.query(
          "INSERT INTO companies(name, email, address) VALUES($1, $2, $3) RETURNING id, email, name, address",
          [payload.name, payload.email, payload.address],
        );

        return result.rows[0];
      } else {
        const result = await db.query(
          "INSERT INTO companies(name, email, address, phone) VALUES($1, $2, $3, $4) RETURNING id, email, name, address, phone",
          [payload.name, payload.email, payload.address, payload.phone],
        );

        return result.rows[0];
      }
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new CompanyAlreadyExist();
      }
      throw error;
    }
  },
  updateUserRoleAndCompanyId: async (
    db: Queryable,
    payload: UserUpdate,
  ): Promise<User> => {
    if (!payload.companyId || !payload.id) {
      throw new Error("Wrong payload details for updating user");
    }

    const result = await db.query(
      "UPDATE users SET company_id = $1, role = 'ADMIN' WHERE id = $2 AND company_id IS NULL RETURNING id, role, company_id",
      [payload.companyId, payload.id],
    );

    if (result.rows.length === 0) throw new AlreadyOnboarded();

    return result.rows[0];
  },
};
