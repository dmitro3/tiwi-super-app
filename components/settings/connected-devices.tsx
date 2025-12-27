"use client";

import { IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";

interface Device {
  id: number;
  device: string;
  ip: string;
  location: string;
  status: string;
  isActive: boolean;
}

interface ConnectedDevicesProps {
  devices: Device[];
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
  onTerminateDevice: (device: Device) => void;
  onTerminateAll: () => void;
}

export default function ConnectedDevices({
  devices,
  onViewChange,
  onGoBack,
  onTerminateDevice,
  onTerminateAll,
}: ConnectedDevicesProps) {
  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          Go Back
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-4">
        Connected Devices
      </h2>

      <p className="text-sm text-[#B5B5B5] mb-6">
        These are the devices currently logged into your TIWI Protocol Wallet. If
        you notice any unfamiliar activity, terminate the session immediately.
      </p>

      <div className="space-y-3 mb-8">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]"
          >
            <div className="flex items-center gap-4 flex-1">
              <p className="text-base font-medium text-white min-w-[140px]">
                {device.device}
              </p>
              <p className="text-sm text-[#B5B5B5] min-w-[120px]">{device.ip}</p>
              <p className="text-sm text-[#B5B5B5] min-w-[100px]">
                {device.location}
              </p>
              <p
                className={`text-sm min-w-[100px] ${
                  device.isActive ? "text-[#B1F128]" : "text-[#B5B5B5]"
                }`}
              >
                {device.status}
              </p>
            </div>
            <button
              onClick={() => onTerminateDevice(device)}
              className="text-[#B1F128] font-medium text-sm hover:opacity-80 transition-opacity ml-4 shrink-0"
            >
              Terminate
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={onTerminateAll}
          className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
        >
          Terminate All Sessions
        </button>
        <p className="text-xs text-center text-[#B5B5B5]">
          Signs out every device except the one you're using now.
        </p>
      </div>
    </div>
  );
}

