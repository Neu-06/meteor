"use client";
import Header from "../components/Header";
import MeteoriteParamsPanel from "../components/MeteoriteParamsPanel";
import dynamic from "next/dynamic";

const CesiumGlobe = dynamic(() => import("../components/CesiumGlobe.js"), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 flex-col sm:flex-row">
        <MeteoriteParamsPanel />
        <div className="flex-1 flex items-center justify-center p-2 sm:p-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-2 border-2 border-gray-300 dark:border-gray-700 w-full max-w-[700px] h-[60vw] max-h-[700px] flex items-center justify-center transition-colors">
            <CesiumGlobe />
          </div>
        </div>
      </div>
    </div>
  );
}