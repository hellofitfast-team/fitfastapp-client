"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-xl text-black tracking-tight">
              {t("progressPhotos").toUpperCase()}
            </h2>
            <p className="font-mono text-xs text-black/70">{t("progressPhotosDescription").toUpperCase()}</p>
          </div>
        </div>
        <div className="p-6">
          {photos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="group relative cursor-pointer border-4 border-black overflow-hidden transition-transform hover:scale-[1.02]"
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
                  <div className="absolute bottom-0 left-0 right-0 bg-black p-2">
                    <p className="text-xs font-mono text-cream">{photo.date}</p>
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
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full border-4 border-black bg-cream" onClick={(e) => e.stopPropagation()}>
            <div className="border-b-4 border-black bg-black p-3 flex items-center justify-between">
              <span className="font-black text-cream">{t("progressPhoto").toUpperCase()}</span>
              <button onClick={() => setSelectedPhoto(null)} className="h-12 w-12 bg-primary flex items-center justify-center hover:bg-cream hover:text-black transition-colors text-white">
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
