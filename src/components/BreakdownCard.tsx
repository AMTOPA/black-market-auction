"use client";

import { formatMoney } from "@/game/format";
import type { SettlementTotals } from "@/game/types";

export interface BreakdownCardProps {
  totals: SettlementTotals;
}

/** 本场结算盈亏明细卡 */
export default function BreakdownCard({ totals }: BreakdownCardProps) {
  const pawnIncome = totals.pawnProceeds > 0 ? totals.pawnProceeds : 0;
  const pawnRedeem = totals.pawnProceeds < 0 ? -totals.pawnProceeds : 0;

  const incomeRows = [
    { label: "藏品出售", value: totals.soldRevenue },
    { label: "特殊买家", value: totals.specialSales },
    { label: "抵押所得", value: pawnIncome },
    { label: "委托/挑战奖励", value: totals.commissionReward },
    { label: "现金利息", value: totals.interestEarned },
  ];

  const expenseRows = [
    { label: "仓储费", value: totals.storageFees },
    { label: "债务利息", value: totals.interestPaid },
    { label: "鉴定费", value: totals.appraisalCosts },
    { label: "抵押赎回", value: pawnRedeem },
  ];

  const hasFlow =
    incomeRows.some((row) => row.value !== 0) || expenseRows.some((row) => row.value !== 0);
  const profitClass = totals.roundProfit >= 0 ? "positive" : "negative";
  const formatSigned = (value: number) =>
    value >= 0 ? `+${formatMoney(value)}` : formatMoney(value);

  return (
    <div className="breakdown-card">
      <div className="breakdown-head">
        <div className="breakdown-title">本场盈亏明细</div>
        <div className={`breakdown-net num ${profitClass}`}>{formatSigned(totals.roundProfit)}</div>
      </div>
      {hasFlow ? (
        <>
          <div className="breakdown-section-label">收入</div>
          {incomeRows.map((row) => (
            <div className="breakdown-row income" key={row.label}>
              <span>{row.label}</span>
              <span className="num">{formatMoney(row.value)}</span>
            </div>
          ))}
          <div className="breakdown-section-label">支出</div>
          {expenseRows.map((row) => (
            <div className="breakdown-row expense" key={row.label}>
              <span>{row.label}</span>
              <span className="num">{formatMoney(row.value)}</span>
            </div>
          ))}
          <div className={`breakdown-total num ${profitClass}`}>
            本场净盈亏 {formatSigned(totals.roundProfit)}
          </div>
        </>
      ) : (
        <div className="muted small">本场没有资金流动</div>
      )}
    </div>
  );
}
