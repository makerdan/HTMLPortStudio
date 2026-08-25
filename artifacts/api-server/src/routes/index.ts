import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portRouter from "./port";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portRouter);

export default router;
