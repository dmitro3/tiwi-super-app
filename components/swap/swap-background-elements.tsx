"use client";

import Image from "next/image";

export default function SwapBackgroundElements() {
  return (
    <>
      {/* Arrow-like Gradient - Bottom Layer (z-0) - Tied to bottom of cards */}
      <div className="absolute bottom-[-15px] sm:bottom-[-20px] md:bottom-[-25px] lg:bottom-[-35px] xl:bottom-[-45px] 2xl:bottom-[-60px] left-1/2 -translate-x-1/2 z-0 pointer-events-none overflow-visible hidden sm:block">
        <div className="w-[220px] h-[160px] sm:w-[320px] sm:h-[240px] md:w-[400px] md:h-[300px] lg:w-[480px] lg:h-[380px] xl:w-[580px] xl:h-[460px] 2xl:w-[728px] 2xl:h-[550px] flex items-end justify-center">
          <Image
            src="/assets/icons/arrow-gradient.svg"
            alt="Arrow Gradient Background"
            width={728}
            height={690}
            className="w-full h-full object-contain"
            style={{ mixBlendMode: "plus-lighter" }}
            priority
          />
        </div>
      </div>

      {/* Chart Visual 1 - Middle Layer (z-10) - Behind chart card, above arrow */}
      <div className="absolute bottom-[-45px] sm:bottom-[-55px] md:bottom-[-65px] lg:bottom-[-70px] xl:bottom-[-85px] 2xl:bottom-[-100px] left-0 lg:left-[-40px] xl:left-[-60px] 2xl:left-[-80px] z-10 pointer-events-none overflow-visible hidden lg:block">
        <div className="w-[240px] h-[200px] lg:w-[320px] lg:h-[280px] xl:w-[400px] xl:h-[360px] 2xl:w-[480px] 2xl:h-[400px]">
          <Image
            src="/assets/images/image 14.svg"
            alt="Chart Visual 1"
            width={700}
            height={600}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      {/* Chart Visual 2 - Middle Layer (z-10) - Behind swap card, above arrow */}
      <div className="absolute bottom-[-45px] sm:bottom-[-55px] md:bottom-[-65px] lg:bottom-[-70px] xl:bottom-[-85px] 2xl:bottom-[-100px] right-0 lg:right-[-30px] xl:right-[-50px] 2xl:right-[-60px] z-10 pointer-events-none overflow-visible hidden lg:block">
        <div className="w-[220px] h-[190px] lg:w-[300px] lg:h-[250px] xl:w-[380px] xl:h-[320px] 2xl:w-[440px] 2xl:h-[360px]">
          <Image
            src="/assets/images/image 15.svg"
            alt="Chart Visual 2"
            width={600}
            height={500}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      {/* Chart Visuals 3-4 Group - Middle Layer (z-10) - Additional background elements */}
      <div className="absolute top-[10%] left-0 right-0 z-10 pointer-events-none overflow-visible hidden 2xl:block">
        {/* Chart Visual 3 */}
        <div className="absolute left-[3%] w-[320px] h-[280px] 2xl:w-[400px] 2xl:h-[320px]">
          <Image
            src="/assets/images/image 16.svg"
            alt="Chart Visual 3"
            width={500}
            height={400}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Chart Visual 4 */}
        <div className="absolute right-[3%] w-[360px] h-[300px] 2xl:w-[440px] 2xl:h-[360px]">
          <Image
            src="/assets/images/image 17.svg"
            alt="Chart Visual 4"
            width={550}
            height={450}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>
    </>
  );
}

