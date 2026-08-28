import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portRouter from "./port";
import authRouter from "./auth";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(portRouter);
router.use(githubRouter);

export default router;
