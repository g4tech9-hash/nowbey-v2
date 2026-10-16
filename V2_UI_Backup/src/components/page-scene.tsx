import Image from "next/image";
import { getSiteSettings } from "@/lib/settings";
import { SCENES, type SceneKey } from "@/lib/themes";

/**
 * A photo behind a banner or card. Put it as the first child of a box that has the "isolate" class,
 * and it sits behind the text. It renders nothing in the Classic look.
 */
export async function PageScene({ name }: { name: SceneKey }) {
  const settings = await getSiteSettings();
  if (settings.theme !== "island") return null;
  const scene = SCENES[name];
  return (
    <div className="nb-pagescene" aria-hidden="true">
      <Image src={scene.src} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" style={{ objectFit: "cover", objectPosition: scene.focus }} />
      <div className="nb-pagescene-veil" />
    </div>
  );
}
