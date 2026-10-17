import { Cta } from "./components/Cta";
import { Faq } from "./components/Faq";
import { FeatureRegistry } from "./components/FeatureRegistry";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Spotlight } from "./components/Spotlight";

/**
 * The landing page.
 *
 * The order of the sections is the order of a reader's questions:
 *   what is this -> what does it do -> how does it work -> is it real -> start.
 *
 * Every section reads its words from `src/content`, and the feature registry reads its
 * cards from `src/content/featureRegistry.ts`, so copy and content changes never mean
 * editing a component.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 font-sans text-mist-300 antialiased">
      <Nav />
      <main>
        <Hero />
        <FeatureRegistry />
        <Spotlight />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

export { App };
