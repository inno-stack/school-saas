import { Role } from "@prisma/client";

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  schoolId: string;
}

export interface RegisterSchoolBody {
  schoolName: string;
  schoolEmail: string;
  schoolPhone?: string;
  schoolAddress?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}
