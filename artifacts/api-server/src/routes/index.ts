import { Router, type IRouter } from "express";
import healthRouter from "./health";
import executeRouter from "./execute";
import projectRouter from "./project";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/execute", executeRouter);
router.use("/project", projectRouter);

export default router;
