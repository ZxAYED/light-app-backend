import cron from "node-cron";

import { GoalStatus, GoalType, NotificationType } from "@prisma/client";
import prisma from "../shared/prisma";
import { NotificationService } from "../app/modules/notification/notification.service";


function daysBetween(date1: Date, date2: Date) {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

cron.schedule("0 0 * * *", async () => {
 

  await prisma.goalAssignment.updateMany({
    where: {
      goal: {
        type: GoalType.DAILY,
        status: GoalStatus.ACTIVE,
        isDeleted: false,
      },
    },
    data: { percentage: 0 },
  });

  const assignments = await prisma.goalAssignment.findMany({
    where: {
      goal: {
        type: GoalType.DAILY,
        status: GoalStatus.ACTIVE,
        isDeleted: false,
      },
    },
    select: {
      childId: true,
      goalId: true,
      goal: { select: { title: true } },
    },
  });
  for (const a of assignments) {
    await NotificationService.createAndSendNow({
      type: NotificationType.DAILY_REMINDER,
      title: "Daily reminder",
      message: `Time to work on: ${a.goal.title}`,
      childId: a.childId,
      data: { goalId: a.goalId },
    });
  }

});


cron.schedule("0 1 * * *", async () => {


  const now = new Date();

  const weeklyGoals = await prisma.goal.findMany({
    where: {
      type: GoalType.WEEKLY,
      status: GoalStatus.ACTIVE,
      isDeleted: false,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  for (const goal of weeklyGoals) {
    if (daysBetween(now, goal.createdAt) % 7 === 0) {
      await prisma.goalAssignment.updateMany({
        where: { goalId: goal.id },
        data: { percentage: 0 },
      });

      await prisma.goal.update({
        where: { id: goal.id },
        data: { progress: 0 },
      });

  
    }
  }
});


      // RESET MONTHLY GOALS (creation-based — every 30 days)

cron.schedule("0 2 * * *", async () => {


  const now = new Date();

  const monthlyGoals = await prisma.goal.findMany({
    where: {
      type: GoalType.MONTHLY,
      status: GoalStatus.ACTIVE,
      isDeleted: false,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  for (const goal of monthlyGoals) {
    if (daysBetween(now, goal.createdAt) % 30 === 0) {
      await prisma.goalAssignment.updateMany({
        where: { goalId: goal.id },
        data: { percentage: 0 },
      });

      await prisma.goal.update({
        where: { id: goal.id },
        data: { progress: 0 },
      });

     
    }
  }
});


      // AUTO-CANCEL EXPIRED GOALS (endDate)

cron.schedule("*/30 * * * *", async () => {

  const now = new Date();

  await prisma.goal.updateMany({
    where: {
      endDate: { lt: now },
      status: GoalStatus.ACTIVE,
      isDeleted: false,
    },
    data: {
      status: GoalStatus.CANCELLED,
    },
  });


  
});
