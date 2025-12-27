"use client";

interface ActionButtonsProps {
  activeButton?: "Stake" | "Active Positions" | "My Stakes";
  onButtonClick?: (button: "Stake" | "Active Positions" | "My Stakes") => void;
}

export default function ActionButtons({
  activeButton = "Stake",
  onButtonClick,
}: ActionButtonsProps) {
  const buttons: Array<"Stake" | "Active Positions" | "My Stakes"> = [
    "Stake",
    "Active Positions",
    "My Stakes",
  ];

  return (
    <div className="flex gap-2 h-12 items-center relative shrink-0 w-full">
      {buttons.map((button) => {
        const isActive = activeButton === button;
        return (
          <button
            key={button}
            onClick={() => onButtonClick?.(button)}
            className={`flex h-full items-center justify-center px-6 py-1.5 relative rounded-lg shrink-0 cursor-pointer transition-colors ${
              isActive
                ? "bg-[#081f02]"
                : "bg-[#0b0f0a]"
            } ${
              button === "Active Positions" ? "w-[124px] sm:w-auto" : ""
            }`}
          >
            <p
              className={`font-['Manrope',sans-serif] leading-normal relative shrink-0 text-sm sm:text-base tracking-[0.014px] sm:tracking-[0.016px] ${
                isActive
                  ? "font-semibold text-[#b1f128]"
                  : "font-medium text-[#b5b5b5]"
              }`}
            >
              {button}
            </p>
          </button>
        );
      })}
    </div>
  );
}

