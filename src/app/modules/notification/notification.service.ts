import prisma from "../../../shared/prisma";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { buildDynamicFilters } from "../../../helpers/buildDynamicFilters";

const NotificationSearchableFields = ["name"]; // adjust fields

const getAllNotificationFromDB = async (query: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(query);

  const whereConditions = buildDynamicFilters(query, NotificationSearchableFields);

  const total = await prisma.notification.count({ where: whereConditions });
  const result = await prisma.notification.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  const meta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return { data: result, meta };
};

const getSingleNotificationFromDB = async (id: string) => {
  return prisma.notification.findUnique({ where: { id } });
};

const postNotificationIntoDB = async (data: any) => {
  return prisma.notification.create({ data });
};

const updateNotificationIntoDB = async ({ id, ...data }: any) => {
  return prisma.notification.update({ where: { id }, data });
};

const deleteNotificationFromDB = async (id: string) => {
  return prisma.notification.delete({ where: { id } });
};

export const NotificationService = {
  getAllNotificationFromDB,
  getSingleNotificationFromDB,
  postNotificationIntoDB,
  updateNotificationIntoDB,
  deleteNotificationFromDB,
};
