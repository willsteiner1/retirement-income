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
 * Clear and direct tone - no jargon, simple sentences.
 */
export function generateNarrative(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown,
  goal: IncomeGoal,
  portfolio: Portfolio
): ClientNarrative {
  const sections: NarrativeSection[] = [];

  // Section 1: Your Goal
  sections.push({
    title: 'Your Goal',
    content: generateGoalSection(goal, breakdown),
  });

  // Section 2: Income Sources
  sections.push({
    title: 'Your Income Sources',
    content: generateSourcesSection(strategy, breakdown, portfolio),
  });

  // Section 3: Tax Strategy
  sections.push({
    title: 'Tax Strategy',
    content: generateOptimizationSection(strategy, breakdown),
  });

  // Section 4: Bottom Line
  sections.push({
    title: 'Bottom Line',
    content: generateResultSection(breakdown),
  });

  // Section 5: RMD explanation (if applicable)
  if (strategy.rmdAmount > 0) {
    sections.push({
      title: 'Required Distribution',
      content: generateRMDSection(strategy, goal),
    });
  }

  // Section 6: Tax rate explanation (if applicable)
  const arbitrageSection = generateArbitrageSection(breakdown, goal);
  if (arbitrageSection) {
    sections.push({
      title: 'Why Your Tax Rate Is Low',
      content: arbitrageSection,
    });
  }

  return {
    headline: `${new Date().getFullYear()} Income Plan`,
    sections,
    disclaimer: 'For educational purposes only. Consult a tax professional for advice specific to your situation.',
  };
}

function generateGoalSection(goal: IncomeGoal, breakdown: TaxBreakdown): string {
  const goalType = goal.targetType === 'afterTax' ? 'after-tax' : 'gross';
  const filingLabel = FILING_STATUS_LABELS[goal.filingStatus];

  let content = `Target: ${formatCurrency(goal.amount)} ${goalType} income.\n`;
  content += `Filing status: ${filingLabel}.\n`;
  content += `Age: ${goal.primaryAge}`;
  if (goal.spouseAge) {
    content += ` (spouse: ${goal.spouseAge})`;
  }
  content += '.';

  const achieved = goal.targetType === 'afterTax'
    ? breakdown.afterTaxIncome >= goal.amount * 0.99
    : breakdown.grossIncome >= goal.amount * 0.99;

  if (achieved) {
    content += `\n\n✓ This plan meets your goal.`;
  } else {
    const shortfall = goal.targetType === 'afterTax'
      ? goal.amount - breakdown.afterTaxIncome
      : goal.amount - breakdown.grossIncome;
    content += `\n\n⚠ ${formatCurrency(shortfall)} short of goal.`;
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
    let line = `Traditional 401(k)/IRA: ${formatCurrency(strategy.traditionalWithdrawal)}`;
    if (strategy.rmdAmount > 0) {
      line += ` (includes ${formatCurrency(strategy.rmdAmount)} required minimum)`;
    }
    sources.push(line);
  }

  if (strategy.taxableWithdrawal > 0) {
    const gainsPercent = portfolio.taxable
      ? ((portfolio.taxable.unrealizedGains / portfolio.taxable.balance) * 100).toFixed(0)
      : '0';
    sources.push(`Taxable investments: ${formatCurrency(strategy.taxableWithdrawal)} (${gainsPercent}% gains)`);
  }

  if (strategy.rothWithdrawal > 0) {
    sources.push(`Roth: ${formatCurrency(strategy.rothWithdrawal)} (tax-free)`);
  }

  if (strategy.socialSecurityIncome > 0) {
    sources.push(`Social Security: ${formatCurrency(strategy.socialSecurityIncome)}`);
  }

  if (strategy.pensionIncome > 0) {
    sources.push(`Pension: ${formatCurrency(strategy.pensionIncome)}`);
  }

  if (sources.length === 0) {
    return 'No income sources specified.';
  }

  let content = '';
  sources.forEach((source) => {
    content += `• ${source}\n`;
  });

  content += `\nTotal: ${formatCurrency(breakdown.grossIncome)}`;

  return content;
}

function generateOptimizationSection(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown
): string {
  const points: string[] = [];

  // Bracket info
  if (breakdown.marginalOrdinaryRate <= 22) {
    points.push(`Your income stays in the ${breakdown.marginalOrdinaryRate}% bracket or lower.`);
  } else {
    points.push(`Top tax bracket: ${breakdown.marginalOrdinaryRate}%.`);
  }

  // Capital gains rate
  if (breakdown.longTermCapitalGains > 0) {
    if (breakdown.capitalGainsBracket.rate === 0) {
      points.push(`Investment gains: 0% tax rate.`);
    } else {
      points.push(`Investment gains: ${breakdown.capitalGainsBracket.rate}% rate (lower than ordinary income).`);
    }
  }

  // Roth usage
  if (strategy.rothWithdrawal > 0) {
    points.push(`Roth withdrawal: ${formatCurrency(strategy.rothWithdrawal)} tax-free.`);
  }

  // Social Security taxation
  if (breakdown.socialSecurityGross > 0) {
    const ssPercent = ((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0);
    points.push(`Social Security: ${ssPercent}% taxable.`);
  }

  if (points.length === 0) {
    return 'Standard withdrawal strategy.';
  }

  return points.map(p => `• ${p}`).join('\n');
}

function generateResultSection(breakdown: TaxBreakdown): string {
  let content = `Gross income: ${formatCurrency(breakdown.grossIncome)}\n`;
  content += `${breakdown.deductionType.charAt(0).toUpperCase() + breakdown.deductionType.slice(1)} deduction: -${formatCurrency(breakdown.deductions)}\n`;
  content += `Federal tax: -${formatCurrency(breakdown.ordinaryIncomeTax + breakdown.capitalGainsTax)}`;

  if (breakdown.capitalGainsTax > 0) {
    content += ` (income: ${formatCurrency(breakdown.ordinaryIncomeTax)}, gains: ${formatCurrency(breakdown.capitalGainsTax)})`;
  }
  content += '\n';

  if (breakdown.stateTax > 0) {
    content += `State tax: -${formatCurrency(breakdown.stateTax)}\n`;
  }

  content += `\nYou keep: ${formatCurrency(breakdown.afterTaxIncome)}\n`;
  content += `Effective tax rate: ${formatPercent(breakdown.effectiveRate)}`;

  return content;
}

function generateRMDSection(strategy: WithdrawalStrategy, goal: IncomeGoal): string {
  let content = `At age ${goal.primaryAge}, the IRS requires a minimum withdrawal from Traditional accounts.\n\n`;
  content += `Your required minimum: ${formatCurrency(strategy.rmdAmount)}\n`;

  if (strategy.traditionalWithdrawal > strategy.rmdAmount) {
    const extra = strategy.traditionalWithdrawal - strategy.rmdAmount;
    content += `Additional withdrawal: ${formatCurrency(extra)}`;
  } else {
    content += `Withdrawing exactly the minimum.`;
  }

  return content;
}

function generateArbitrageSection(
  breakdown: TaxBreakdown,
  _goal: IncomeGoal
): string | null {
  // Only show if effective rate is notably low
  if (breakdown.effectiveRate >= 0.15) {
    return null;
  }

  const reasons: string[] = [];

  // Deduction impact
  reasons.push(`${formatCurrency(breakdown.deductions)} deduction shields income from tax.`);

  // Progressive tax system
  if (breakdown.marginalOrdinaryRate > 12) {
    reasons.push(`Lower brackets (10%, 12%) apply to your first dollars of income.`);
  }

  // Tax-free income
  if (breakdown.rothIncome > 0) {
    reasons.push(`Roth income (${formatCurrency(breakdown.rothIncome)}) is not taxed.`);
  }

  // Preferential capital gains
  if (breakdown.longTermCapitalGains > 0 && breakdown.capitalGainsBracket.rate < 20) {
    reasons.push(`Investment gains taxed at ${breakdown.capitalGainsBracket.rate}%, not ordinary rates.`);
  }

  return reasons.map(r => `• ${r}`).join('\n');
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
