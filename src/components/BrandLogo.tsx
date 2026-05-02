import Image from "next/image";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

type BrandNameProps = {
  className?: string;
};

const sizes = {
  sm: { image: 32, text: "text-lg" },
  md: { image: 44, text: "text-2xl" },
  lg: { image: 64, text: "text-3xl" },
} as const;

export function BrandName({ className = "" }: BrandNameProps) {
  return (
    <span className={`font-display font-bold ${className}`}>
      <span className="text-purple-700">EM</span>
      <span className="text-gray-950">PAY</span>
    </span>
  );
}

export function BrandLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: BrandLogoProps) {
  const logoSize = sizes[size];

  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <Image
        src="/empay.png"
        alt="EMPAY logo"
        width={logoSize.image}
        height={logoSize.image}
        priority={size === "lg"}
        className="shrink-0 object-contain"
      />
      {showWordmark && (
        <BrandName className={logoSize.text} />
      )}
    </div>
  );
}
