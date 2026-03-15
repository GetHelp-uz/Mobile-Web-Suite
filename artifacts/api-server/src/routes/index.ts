import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import shopsRouter from "./shops.js";
import toolsRouter from "./tools.js";
import rentalsRouter from "./rentals.js";
import paymentsRouter from "./payments.js";
import analyticsRouter from "./analytics.js";
import plansRouter from "./plans.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/shops", shopsRouter);
router.use("/tools", toolsRouter);
router.use("/rentals", rentalsRouter);
router.use("/payments", paymentsRouter);
router.use("/analytics", analyticsRouter);
router.use("/plans", plansRouter);

export default router;
