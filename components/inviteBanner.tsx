import Image from "next/image";

export default function InviteBanner() {
  return (
    <div className="px-4">
      <div className="relative overflow-hidden flex justify-between items-center rounded-md bg-linear-to-b from-[#B1F128] via-[#00C65F] via-31% to-[#009288] w-full py-4 md:max-w-225 mx-auto">
        <p className="ml-5 md:ml-10 font-bold font-manrope text-base md:text-2xl w-28 md:w-52.5 text-[#010501]">
          Invite Friends. Unlock rewards.
        </p>

        <Image
          src="/banner-img.svg"
          alt=""
          width={200}
          height={200}
          className="absolute -right-16 md:right-0 bottom-0 h-full w-auto object-contain rounded-br-md"
        />
      </div>
    </div>
  );
}

