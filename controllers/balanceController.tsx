import ethers from "ethers";
import chains from "../config/chains";
import { Request, Response } from "express";
import pQueue from "p-queue";

const rpcRequestQueue = new pQueue({
  concurrency: 5,
  timeout: 2 * 1000,
});

const isValidAddress = (address: string) => {
  try {
    return ethers.utils.isAddress(address);
  } catch (e) {
    return false;
  }
};

const getBalance = async (chainId: string, address: string) => {
  if (!isValidAddress(address)) {
    throw new Error("Invalid Ethereum address format.");
  }

  const chainConfig = chains[chainId as keyof typeof chains];
  if (!chainConfig) {
    throw new Error(`Chain ID '${chainId}' not found or configured.`);
  }

  if (!chainConfig.rpcUrl) {
    throw new Error(`RPC URL for chain '${chainId}' is not configured.`);
  }

  return rpcRequestQueue.add(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
      const balanceWei = await provider.getBalance(address);
      const balanceEther = parseFloat(
        ethers.utils.formatEther(balanceWei)
      ).toFixed(6);
      return balanceEther;
    } catch (error) {
      console.error(
        `Error getting balance for ${address} on ${chainConfig.name}:`,
        error
      );
      throw new Error(
        `Failed to retrieve balance for ${address} on ${chainConfig.name}. Please check RPC connection or try again later.`
      );
    }
  });
};

const handleGetAllBalances = async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: "Missing address parameter." });
  }

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: "Invalid Ethereum address format." });
  }

  const results: Record<string, any> = {};
  const promises = Object.keys(chains).map(async (chainId) => {
    const chainConfig = chains[chainId as keyof typeof chains];
    try {
      const balance = await getBalance(chainId, address);
      results[chainId] = {
        chainName: chainConfig.name,
        balance: balance,
        unit: chainConfig.symbol,
        status: "success",
      };
    } catch (error) {
      results[chainId] = {
        chainName: chainConfig.name,
        error: (error as Error).message,
        status: "failed",
      };
    }
  });

  await Promise.allSettled(promises);

  res.status(200).json({
    address: address,
    balances: results,
  });
};

const handleGetBalance = async (req: Request, res: Response) => {
  const { chainId, address } = req.params;
  if (!chainId || !address) {
    return res
      .status(400)
      .json({ error: "Missing chainId or address parameter." });
  }

  try {
    const balance = await getBalance(chainId, address);
    res.status(200).json({
      chain: chains[chainId as keyof typeof chains]
        ? chains[chainId as keyof typeof chains].name
        : chainId,
      address: address,
      balance: balance + " " + chains[chainId as keyof typeof chains].symbol,
      unit: chains[chainId as keyof typeof chains].symbol,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export { handleGetBalance, handleGetAllBalances, getBalance };
