import express from "express";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { GoalRoutes } from "../modules/Goal/goal.routes";
import { AvatarRoutes } from "../modules/avatar/avatar.routes";
import { NotificationRoutes } from "../modules/notification/notification.routes";



const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/goals",
    route: GoalRoutes,

  },
  {
    path: "/avatar",
    route: AvatarRoutes,

  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },

  
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
