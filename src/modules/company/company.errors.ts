export class IncompleteCompanyDetails extends Error {
  constructor() {
    super("Insuffient details to create a company");
    this.name = "IncompleteCompanyDetails";
  }
}

export class CompanyAlreadyExist extends Error {
  constructor() {
    super("Company with this details already exist");
    this.name = "CompanyAlreadyExist";
  }
}

export class AlreadyOnboarded extends Error {
  constructor() {
    super("User is already a part of an organisation");
    this.name = "AlreadyOnboarded";
  }
}
