import type {
  TaxBreakdown,
  WithdrawalStrategy,
  IncomeGoal,
  Portfolio,
} from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { FILING_STATUS_LABELS } from '../constants/tax2026';

export interface NarrativeSection {
  title: string;
  content: string;
}

export interface ClientNarrative {
  headline: string;
  sections: NarrativeSection[];
  disclaimer: string;
}

/**
 * Generate a plain-language narrative explaining the retirement income plan.
 * This is designed to be client-facing - jargon-free and easy to understand.
 */
export function generateNarrative(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown,
  goal: IncomeGoal,
  portfolio: Portfolio
): ClientNarrative {
  const sections: NarrativeSection[] = [];

  // Section 1: What we're trying to achieve
  sections.push({
    title: "What we're trying to achieve",
    content: generateGoalSection(goal, breakdown),
  });

  // Section 2: Where the income comes from
  sections.push({
    title: 'Where the income comes from',
    content: generateSourcesSection(strategy, breakdown, portfolio),
  });

  // Section 3: How it's optimized
  sections.push({
    title: "How it's optimized",
    content: generateOptimizationSection(strategy, breakdown),
  });

  // Section 4: The result
  sections.push({
    title: 'The result',
    content: generateResultSection(breakdown),
  });

  // Section 5: RMD explanation (if applicable)
  if (strategy.rmdAmount > 0) {
    sections.push({
      title: 'About Your Required Minimum Distribution',
      content: generateRMDSection(strategy, goal),
    });
  }

  // Section 6: Tax rate arbitrage (if applicable)
  const arbitrageSection = generateArbitrageSection(breakdown, goal);
  if (arbitrageSection) {
    sections.push({
      title: 'Why your effective rate is low',
      content: arbitrageSection,
    });
  }

  return {
    headline: `Your ${new Date().getFullYear()} Retirement Income Plan`,
    sections,
    disclaimer: 'This summary is for educational purposes only and does not constitute tax or financial advice. Please consult with a qualified tax professional for guidance specific to your situation.',
  };
}

function generateGoalSection(goal: IncomeGoal, breakdown: TaxBreakdown): string {
  const goalType = goal.targetType === 'afterTax' ? 'after-tax' : 'total';
  const filingLabel = FILING_STATUS_LABELS[goal.filingStatus];

  let content = `You want ${formatCurrency(goal.amount)} of ${goalType} income this year. `;
  content += `You're filing as ${filingLabel}`;

  if (goal.spouseAge) {
    content += `, with you at age ${goal.primaryAge} and your spouse at age ${goal.spouseAge}`;
  } else {
    content += ` at age ${goal.primaryAge}`;
  }

  content += '.';

  // Add goal achievement status
  const achieved = goal.targetType === 'afterTax'
    ? breakdown.afterTaxIncome >= goal.amount * 0.99
    : breakdown.grossIncome >= goal.amount * 0.99;

  if (achieved) {
    content += ` This plan achieves your income goal.`;
  } else {
    const shortfall = goal.targetType === 'afterTax'
      ? goal.amount - breakdown.afterTaxIncome
      : goal.amount - breakdown.grossIncome;
    content += ` Note: This plan is ${formatCurrency(shortfall)} short of your goal, which may require adjustments.`;
  }

  return content;
}

function generateSourcesSection(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown,
  portfolio: Portfolio
): string {
  const sources: string[] = [];

  if (strategy.traditionalWithdrawal > 0) {
    let traditionalDesc = `${formatCurrency(strategy.traditionalWithdrawal)} from your Traditional 401(k)/IRA`;
    if (strategy.rmdAmount > 0) {
      traditionalDesc += ` (includes ${formatCurrency(strategy.rmdAmount)} Required Minimum Distribution)`;
    }
    sources.push(traditionalDesc);
  }

  if (strategy.taxableWithdrawal > 0) {
    const gainsPercent = portfolio.taxable
      ? ((portfolio.taxable.unrealizedGains / portfolio.taxable.balance) * 100).toFixed(0)
      : '0';
    sources.push(`${formatCurrency(strategy.taxableWithdrawal)} from your taxable investment account (about ${gainsPercent}% is gains)`);
  }

  if (strategy.rothWithdrawal > 0) {
    sources.push(`${formatCurrency(strategy.rothWithdrawal)} from your Roth account`);
  }

  if (strategy.socialSecurityIncome > 0) {
    sources.push(`${formatCurrency(strategy.socialSecurityIncome)} from Social Security`);
  }

  if (strategy.pensionIncome > 0) {
    sources.push(`${formatCurrency(strategy.pensionIncome)} from your pension`);
  }

  if (sources.length === 0) {
    return 'No income sources were specified.';
  }

  let content = 'Your income this year comes from:\n\n';
  sources.forEach((source) => {
    content += `• ${source}\n`;
  });

  content += `\nThis adds up to ${formatCurrency(breakdown.grossIncome)} in total income before taxes.`;

  return content;
}

function generateOptimizationSection(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown
): string {
  const points: string[] = [];

  // Lower bracket filling
  if (breakdown.marginalOrdinaryRate <= 22) {
    points.push(
      "We're keeping your taxable income in the lower tax brackets, where every dollar is taxed at 22% or less."
    );
  }

  // Capital gains rate
  if (breakdown.longTermCapitalGains > 0) {
    if (breakdown.capitalGainsBracket.rate === 0) {
      points.push(
        "Investment gains from your taxable account qualify for the 0% capital gains rate, meaning you pay no federal tax on those gains."
      );
    } else if (breakdown.capitalGainsBracket.rate === 15) {
      points.push(
        "Investment gains are taxed at the preferential 15% capital gains rate, rather than your ordinary income rate."
      );
    }
  }

  // Roth usage
  if (strategy.rothWithdrawal > 0) {
    points.push(
      `Your ${formatCurrency(strategy.rothWithdrawal)} Roth withdrawal is completely tax-free, providing income without increasing your tax bill.`
    );
  }

  // Social Security taxation
  if (breakdown.socialSecurityGross > 0) {
    const ssPercent = ((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0);
    if (parseFloat(ssPercent) < 85) {
      points.push(
        `Only ${ssPercent}% of your Social Security is taxable. By managing other income sources, we've kept more of your Social Security tax-free.`
      );
    }
  }

  if (points.length === 0) {
    return "This strategy provides a straightforward approach to meeting your income needs.";
  }

  return points.join('\n\n');
}

function generateResultSection(breakdown: TaxBreakdown): string {
  let content = `Starting with ${formatCurrency(breakdown.grossIncome)} in total income:\n\n`;

  content += `• ${formatCurrency(breakdown.deductions)} is covered by your ${breakdown.deductionType} deduction\n`;
  content += `• ${formatCurrency(breakdown.ordinaryIncomeTax)} goes to federal ordinary income tax\n`;

  if (breakdown.capitalGainsTax > 0) {
    content += `• ${formatCurrency(breakdown.capitalGainsTax)} goes to federal capital gains tax\n`;
  }

  if (breakdown.stateTax > 0) {
    content += `• ${formatCurrency(breakdown.stateTax)} goes to state income tax\n`;
  }

  content += `\n**You keep ${formatCurrency(breakdown.afterTaxIncome)} after taxes.**\n\n`;

  content += `Your effective tax rate is ${formatPercent(breakdown.effectiveRate)} — `;
  content += `this means for every dollar of income, you keep about ${(100 - breakdown.effectiveRate * 100).toFixed(0)} cents.`;

  return content;
}

function generateRMDSection(strategy: WithdrawalStrategy, goal: IncomeGoal): string {
  let content = `At age ${goal.primaryAge}, the IRS requires you to take a minimum distribution from your Traditional retirement accounts each year. `;
  content += `This is called a Required Minimum Distribution (RMD).\n\n`;

  content += `Your RMD for this year is ${formatCurrency(strategy.rmdAmount)}. `;
  content += `This amount must be withdrawn and is automatically included in your Traditional withdrawal above.\n\n`;

  if (strategy.traditionalWithdrawal > strategy.rmdAmount) {
    const extra = strategy.traditionalWithdrawal - strategy.rmdAmount;
    content += `You're withdrawing ${formatCurrency(extra)} more than the required minimum, `;
    content += `which may be part of an overall strategy to manage your tax brackets over time.`;
  } else {
    content += `Your Traditional withdrawal is exactly at the required minimum.`;
  }

  return content;
}

function generateArbitrageSection(
  breakdown: TaxBreakdown,
  _goal: IncomeGoal
): string | null {
  // Only show if effective rate is notably low
  if (breakdown.effectiveRate >= 0.20) {
    return null;
  }

  let content = '';

  if (breakdown.effectiveRate < 0.10) {
    content = `Your effective rate of just ${formatPercent(breakdown.effectiveRate)} is remarkably low. `;
  } else {
    content = `Your ${formatPercent(breakdown.effectiveRate)} effective rate is lower than many people expect. `;
  }

  content += 'This happens because:\n\n';

  const reasons: string[] = [];

  // Deduction impact
  reasons.push(
    `The ${breakdown.deductionType} deduction of ${formatCurrency(breakdown.deductions)} shields a significant portion of your income from any tax.`
  );

  // Progressive tax system
  if (breakdown.marginalOrdinaryRate > 12) {
    reasons.push(
      `Even though your highest dollars are taxed at ${breakdown.marginalOrdinaryRate.toFixed(0)}%, your first dollars are taxed at just 10% and 12%. The "effective" rate averages across all these brackets.`
    );
  }

  // Tax-free income
  if (breakdown.rothIncome > 0) {
    reasons.push(
      `Your Roth withdrawal of ${formatCurrency(breakdown.rothIncome)} counts as income for your lifestyle but isn't taxed at all.`
    );
  }

  // Preferential capital gains
  if (breakdown.longTermCapitalGains > 0 && breakdown.capitalGainsBracket.rate < 20) {
    reasons.push(
      `Your investment gains qualify for the ${breakdown.capitalGainsBracket.rate}% capital gains rate instead of ordinary income rates.`
    );
  }

  reasons.forEach(reason => {
    content += `• ${reason}\n\n`;
  });

  return content;
}

/**
 * Generate a shorter summary suitable for print or export
 */
export function generateShortSummary(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown
): string {
  let taxBreakdown = `Federal: ${formatCurrency(breakdown.ordinaryIncomeTax + breakdown.capitalGainsTax)}`;
  if (breakdown.stateTax > 0) {
    taxBreakdown += ` | State: ${formatCurrency(breakdown.stateTax)}`;
  }

  let traditionalLine = `- Traditional 401(k)/IRA: ${formatCurrency(strategy.traditionalWithdrawal)}`;
  if (strategy.rmdAmount > 0) {
    traditionalLine += ` (RMD: ${formatCurrency(strategy.rmdAmount)})`;
  }

  return `
Retirement Income Summary

Total Income: ${formatCurrency(breakdown.grossIncome)}
Total Taxes: ${formatCurrency(breakdown.totalTax)} (${taxBreakdown})
After-Tax Income: ${formatCurrency(breakdown.afterTaxIncome)}
Effective Tax Rate: ${formatPercent(breakdown.effectiveRate)}

Income Sources:
${traditionalLine}
- Taxable Investments: ${formatCurrency(strategy.taxableWithdrawal)}
- Roth Account: ${formatCurrency(strategy.rothWithdrawal)}
- Social Security: ${formatCurrency(strategy.socialSecurityIncome)}
- Pension: ${formatCurrency(strategy.pensionIncome)}

Tax Year 2026
  `.trim();
}
