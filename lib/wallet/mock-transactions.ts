/**
 * Mock transaction data for wallet balance panel
 * Will be replaced with real API data in the future
 */

export interface Transaction {
  id: string;
  type: "Swap" | "Sent" | "Received" | "Stake" | "Unstake";
  date: string;
  amount: string;
  quantity: string;
  token?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "Swap",
    date: "Oct 9, 2024",
    amount: "-$1,525.50",
    quantity: "980,000,000,006 TWC",
  },
  {
    id: "2",
    type: "Sent",
    date: "Jan 4, 2025",
    amount: "-$725.50",
    quantity: "255,000,000,006 TWC",
  },
  {
    id: "3",
    type: "Received",
    date: "Oct 9, 2024",
    amount: "+$2,000.50",
    quantity: "1.5 ETH",
  },
];

export const MOCK_BALANCE = {
  total: "$4,631.21",
  change: "+$61.69",
  changePercent: "+2.51%",
  claimableRewards: "$8.52",
};

