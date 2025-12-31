import Image from "next/image";

// Sample icons you can replace with your real icons or images
const icons = [
  "/icons/twc.png",
  "/icons/bitcoin.png",
  "/icons/ethereum.png",
  "/icons/solana.png",
  "/icons/polygon.png",
  "/icons/arbitrum.png",
  "/icons/cp.png",
  "/icons/sushi.png",
  "/icons/trade.png",
  "/icons/uniswap.png",
  "/icons/cosmos.png",
  "/icons/ronin.png",
];

// Sample text segments
const segments = [
  "50+ Active Chains",
  "TWC $0.095 -12.1%",
  "20+ Smart Markets",
];

export default function ChartHeader() {
  return (
    <div className="relative w-full overflow-hidden bg-[#0a1309] rounded-md border border-green-900 shadow-[0_0_15px_#20f671] py-2 select-none">
      {/* The scrolling container */}
      <div
        className="flex whitespace-nowrap animate-marquee"
        style={{ gap: "1.5rem" }}
      >
        {/* Repeat content twice for seamless loop */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            {/* Left segment */}
            <span className="text-white/70 font-sans text-sm">
              {segments[0]}
            </span>

            {/* TWC price */}
            <div className="flex items-center space-x-1 text-white/70 text-sm font-sans">
              <Image
                src={icons[0]}
                alt="TWC"
                width={20}
                height={20}
                className="rounded-full"
              />
              <span>TWC $0.095</span>
              <span className="text-red-600">-12.1%</span>
            </div>

            {/* Crypto icons */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <Image
                  key={idx}
                  src={icons[idx]}
                  alt="Crypto icon"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ))}
            </div>

            {/* Right segment */}
            <span className="text-white/70 font-sans text-sm">
              {segments[2]}
            </span>

            {/* Other icons */}
            <div className="flex items-center space-x-2">
              {[7, 8, 9, 10, 11].map((idx) => (
                <Image
                  key={idx}
                  src={icons[idx]}
                  alt="Market icon"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

