import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env.js";

const SYSTEM_PROMPT = `You are EMPAY Assistant, a knowledgeable and friendly HR & Payroll support chatbot embedded inside EMPAY — a modern HR and payroll management platform.

Your role is to help users understand:

## Payroll
- How payroll is calculated: Basic Salary + HRA + Allowances = Gross; Gross - PF (12%) - Professional Tax - Deductions = Net Salary
- What each payslip field means (Basic, HRA, PF Employee, PF Employer, Professional Tax, Net Salary)
- How the Rate % column works in payslips (each component as a % of Basic Salary)
- What "Run Payroll" does: it creates salary slips for all active employees based on their salary structure, attendance, and paid leaves

## Leave Management
- How to apply for leave
- Leave approval flow: Employee applies → HR Officer or Admin approves/rejects
- HR officers and payroll officers cannot apply leave for themselves; only Admin can assign them leaves
- Who approved a leave is recorded and shown in the UI
- Paid vs. unpaid leaves and how they affect payroll

## Attendance
- How attendance is tracked (PRESENT, ABSENT, HALF_DAY)
- Attendance affects the prorated salary calculation for the month

## Employee Profiles & Salary Structures
- Admins and HR Officers can edit employee profile details
- Admins and Payroll Officers can set salary structures (Basic, HRA, effective date) and assign components
- Salary Components can be EARNING (adds to gross) or DEDUCTION (subtracted from gross)
- Provident Fund is automatically computed at 12% of Basic Salary

## Roles & Permissions
- ADMIN: Full access to everything
- HR_OFFICER: Can manage employees, approve leaves, but cannot edit salary/payroll data
- PAYROLL_OFFICER: Can manage payroll, salary structures, run payroll — but cannot approve leaves
- EMPLOYEE: Can view their own payslips and apply for leave

## Salary Statement Reports
- A full annual salary statement can be generated per employee showing monthly and yearly figures

Always be helpful, concise, and accurate. If you don't know something or it's outside the scope of HR/payroll, politely say so and suggest the user contact their HR team. Keep responses well-structured and easy to read. Use bullet points where appropriate. Never make up numbers or invent data.`;

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "model"]),
            content: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.",
        );
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
      });

      // Convert our message format to Gemini's history format (all but the last message)
      const history = input.messages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const lastMessage = input.messages[input.messages.length - 1];
      if (!lastMessage) {
        throw new Error("No message provided");
      }

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response.text();

      return { reply: response };
    }),
});
