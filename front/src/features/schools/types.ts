export interface School {
  id: string;
  modularCode?: string | null;
  localCode?: string | null;
  name: string;
  documentId: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  isActive: boolean;
}

export interface UpdateSchoolPayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  department?: string;
  province?: string;
  district?: string;
}
