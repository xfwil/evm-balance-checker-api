import { Router } from "express";
import {
  handleGetBalance,
  handleGetAllBalances,
} from "../controllers/balanceController";

const router = Router();

router.get("/:chainId/:address", handleGetBalance);
router.get("/:address", handleGetAllBalances);

export default router;
