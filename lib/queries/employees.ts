import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface EmployeesQueryParams {
  search?: string;
  page: number;
  pageSize: number;
}

export async function queryEmployees(params: EmployeesQueryParams) {
  const where: Prisma.EmployeeWhereInput = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { cosecUserId: { contains: params.search, mode: "insensitive" } },
        ],
      }
    : {};

  const [employees, count] = await Promise.all([
    db.employee.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.employee.count({ where }),
  ]);

  return { employees, count };
}
