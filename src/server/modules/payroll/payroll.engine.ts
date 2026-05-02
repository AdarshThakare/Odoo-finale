import { PF_RATE, lookupProfessionalTax, roundMoney } from "./payroll.utils";

export interface PayrollComponentInput {
  id: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
}

export interface PayrollEngineInput {
  basicSalary: number;
  hra: number;
  components: PayrollComponentInput[];
  totalWorkingDays: number;
  daysWorked: number;
  paidLeaveDays: number;
}

export interface PayrollLineItem {
  salaryComponentId: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
}

export function calculatePayroll(input: PayrollEngineInput) {
  const effectiveDays = input.daysWorked + input.paidLeaveDays;
  const salaryFactor =
    input.totalWorkingDays > 0 ? effectiveDays / input.totalWorkingDays : 0;

  const basicProrated = roundMoney(input.basicSalary * salaryFactor);
  const hraProrated = roundMoney(input.hra * salaryFactor);

  const lineItems = input.components.map((component) => {
    const amount =
      component.type === "EARNING"
        ? roundMoney(component.amount * salaryFactor)
        : roundMoney(component.amount);

    return {
      salaryComponentId: component.id,
      type: component.type,
      amount,
    } satisfies PayrollLineItem;
  });

  const totalEarnings = roundMoney(
    lineItems
      .filter((component) => component.type === "EARNING")
      .reduce((total, component) => total + component.amount, 0),
  );
  const grossSalary = roundMoney(basicProrated + hraProrated + totalEarnings);
  const pfEmployee = roundMoney(basicProrated * PF_RATE);
  const pfEmployer = roundMoney(basicProrated * PF_RATE);
  const professionalTax = lookupProfessionalTax(grossSalary);
  const additionalDeductions = roundMoney(
    lineItems
      .filter((component) => component.type === "DEDUCTION")
      .reduce((total, component) => total + component.amount, 0),
  );
  const totalDeductions = roundMoney(
    pfEmployee + professionalTax + additionalDeductions,
  );
  const netSalary = roundMoney(grossSalary - totalDeductions);

  return {
    basicSalary: basicProrated,
    hra: hraProrated,
    totalEarnings,
    grossSalary,
    pfEmployee,
    pfEmployer,
    professionalTax,
    totalDeductions,
    netSalary,
    effectiveDays: roundMoney(effectiveDays),
    lineItems,
  };
}
