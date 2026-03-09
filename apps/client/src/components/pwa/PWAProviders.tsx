"use client";

import dynamic from "next/dynamic";

const ServiceWorkerRegistration = dynamic(
  () => import("./ServiceWorkerRegistration").then((m) => m.ServiceWorkerRegistration),
  { ssr: false },
);

const InstallPrompt = dynamic(() => import("./InstallPrompt").then((m) => m.InstallPrompt), {
  ssr: false,
});

export function PWAProviders() {
  return (
    <>
      <ServiceWorkerRegistration />
      <InstallPrompt />
    </>
  );
}
