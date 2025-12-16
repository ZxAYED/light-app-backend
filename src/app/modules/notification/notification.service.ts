import axios from "axios";
import { GoogleAuth } from "google-auth-library";
import { buildDynamicFilters } from "../../../helpers/buildDynamicFilters";
import { paginationHelper } from "../../../helpers/paginationHelper";
import prisma from "../../../shared/prisma";

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

const registerPushToken = async (payload: { token: string; platform: "ANDROID" | "IOS"; userId?: string; childId?: string }) => {
  return prisma.pushToken.upsert({
    where: { token: payload.token },
    update: { platform: payload.platform, userId: payload.userId, childId: payload.childId },
    create: {
      token: payload.token,
      platform: payload.platform,
      userId: payload.userId,
      childId: payload.childId
    }
  });
};

const unregisterPushToken = async (token: string) => {
  try {
    return await prisma.pushToken.delete({ where: { token } });
  } catch {
    return null;
  }
};

const tokensForChild = async (childId: string) => {
  const rows = await prisma.pushToken.findMany({ where: { childId }, select: { token: true } });
  return rows.map(r => r.token);
};

const tokensForParent = async (userId: string) => {
  const rows = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
  return rows.map(r => r.token);
};

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/firebase.messaging"] });

async function getAccessToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
}

const sendFcmV1ToToken = async (projectId: string, token: string, title: string, body: string, data?: Record<string, string>) => {
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const payload = { message: { token, notification: { title, body }, data } };
  try {
    const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || "";
    const status = err?.response?.data?.error?.status || "";
    if (String(msg).toLowerCase().includes("not registered") || String(msg).toLowerCase().includes("unregistered") || status === "NOT_FOUND" || status === "INVALID_ARGUMENT") {
      await unregisterPushToken(token);
    }
    throw err;
  }
};

const createAndSendNow = async (input: { type: any; title: string; message: string; childId?: string; parentUserId?: string; data?: Record<string, string> }) => {
  const notif = await prisma.notification.create({ data: { type: input.type, title: input.title, message: input.message, childId: input.childId, parentId: input.parentUserId, isRead: false } });

  if (input.childId) {
    const tokens = await tokensForChild(input.childId);
    for (const t of tokens) {
      try {
        await sendFcmV1ToToken(String(process.env.FIREBASE_PROJECT_ID || ""), t, input.title, input.message, { type: String(input.type), childId: input.childId, ...(input.data || {}) });
      } catch { }
    }
  }
  if (input.parentUserId) {
    const tokens = await tokensForParent(input.parentUserId);
    for (const t of tokens) {
      try {
        await sendFcmV1ToToken(String(process.env.FIREBASE_PROJECT_ID || ""), t, input.title, input.message, { type: String(input.type), parentUserId: input.parentUserId, ...(input.data || {}) });
      } catch { }
    }
  }
  return notif;
};

const listFeedForUser = async (user: any, query: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(query);
  let where: any = {};
  if (user?.role === "CHILD") {
    const child = await prisma.childProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!child) return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    where.childId = child.id;
  } else if (user?.role === "PARENT") {
    where.parentId = user.id;
  }
  const total = await prisma.notification.count({ where });
  const result = await prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } });
  return { data: result, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const markRead = async (id: string) => {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

const markAllRead = async (payload: { childId?: string; parentUserId?: string }) => {
  const where: any = {};
  if (payload.childId) where.childId = payload.childId;
  if (payload.parentUserId) where.parentId = payload.parentUserId;
  await prisma.notification.updateMany({ where, data: { isRead: true } });
  return { updated: true };
};

export const NotificationService = {
  getAllNotificationFromDB,
  getSingleNotificationFromDB,
  postNotificationIntoDB,
  updateNotificationIntoDB,
  deleteNotificationFromDB,
  registerPushToken,
  unregisterPushToken,
  createAndSendNow,
  listFeedForUser,
  markRead,
  markAllRead,
};
