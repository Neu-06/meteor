"use client";
import dynamic from "next/dynamic";
const CesiumGlobe = dynamic(() => import("../components/CesiumGlobe.js"), { ssr: false });

export default function Home() {
  return <CesiumGlobe />;
}