"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { EmptyState } from "@fitfast/ui/empty-state";

interface PhotosTabProps {
  photos: Array<{ url: string; date: string }>;
}

export function PhotosTab({ photos }: PhotosTabProps) {
  const t = useTranslations("progress");
  const tEmpty = useTranslations("emptyStates");
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <>
      <SectionCard icon={Camera} title={t("progressPhotos")} description={t("progressPhotosDescription")}>
        {photos.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="group relative cursor-pointer rounded-xl border border-border overflow-hidden transition-transform hover:scale-[1.02]"
                onClick={() => setSelectedPhoto(photo.url)}
              >
                <div className="relative aspect-[3/4] bg-neutral-100">
                  <Image
                    src={photo.url}
                    alt={`Progress photo from ${photo.date}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
                  <p className="text-xs font-medium text-white">{photo.date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ImageIcon}
            title={tEmpty("noPhotos.title")}
            description={tEmpty("noPhotos.description")}
            action={{
              label: tEmpty("noPhotos.action"),
              onClick: () => router.push("/check-in"),
            }}
          />
        )}
      </SectionCard>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full rounded-2xl bg-card overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="font-semibold text-sm">{t("progressPhoto")}</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Image src={selectedPhoto} alt="Progress photo" width={800} height={600} className="w-full h-auto" />
          </div>
        </div>
      )}
    </>
  );
}
