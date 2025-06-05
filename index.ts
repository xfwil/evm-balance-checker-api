import express from "express";
import type { Request, Response, NextFunction } from "express";
import balanceRoutes from "./routes/balance";

const app = express();
const PORT = 8080;

app.use("/balance", balanceRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the EVM Balance Checker API!");
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
