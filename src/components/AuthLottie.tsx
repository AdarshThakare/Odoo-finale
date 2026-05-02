"use client";

import Lottie from "lottie-react";

import payrollAnimation from "../../public/animation.json";

type AuthLottieProps = {
  className?: string;
};

export function AuthLottie({ className = "" }: AuthLottieProps) {
  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[360px] ${className}`}
      role="img"
      aria-label="Payroll and HR workflow illustration"
    >
      <Lottie
        animationData={payrollAnimation}
        loop
        autoplay
        className="h-full w-full"
      />
    </div>
  );
}
