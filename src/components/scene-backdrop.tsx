"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { SCENE_PHOTOS_PRESENT, SCENES, sceneForPath } from "@/lib/themes";

/** The scenery behind the whole site. It changes with the section you are in and fades in softly. */
export function SceneBackdrop() {
  const pathname = usePathname();
  const key = sceneForPath(pathname);
  if (!SCENE_PHOTOS_PRESENT || !key) return null;
  const scene = SCENES[key];
  return (
    <div className="nb-backdrop" aria-hidden="true">
      <Image key={scene.src} src={scene.src} alt="" fill sizes="100vw" className="nb-backdrop-img" style={{ objectPosition: scene.focus }} />
      <div className="nb-backdrop-veil" />
    </div>
  );
}
