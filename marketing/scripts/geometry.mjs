/**
 * NOWBEY MARKETING — SCREEN GEOMETRY
 * ---------------------------------------------------------------------------
 * Where the glass is, in each source photograph, in that photograph's own
 * pixels. Measured by thresholding the switched-off screen (see
 * scripts/measure-screen.py, which reproduces these numbers) and then checked
 * by eye against a drawn quad. Four corners, not a rectangle: the phone in a
 * photo is never perfectly square-on.
 *
 * Corner order everywhere in this project: top-left, top-right,
 * bottom-right, bottom-left.
 */

export const QUADS = {
  "photo-map-square.png": {
    quad: [
      [647, 427],
      [739, 427],
      [740, 604],
      [646, 604],
    ],
    radius: 9,
    reflection: 0.18,
    brightness: 1.0,
    // the phone sits in a street scene: a soft teal spill suits it
    glow: 0.5,
  },
  "photo-closeup-square.png": {
    quad: [
      [408, 291],
      [620, 292],
      [621, 741],
      [409, 740],
    ],
    radius: 20,
    reflection: 0.22,
    brightness: 1.0,
    glow: 0.5,
  },
  "photo-story-vertical.png": {
    quad: [
      [342, 796],
      [436, 800],
      [437, 982],
      [345, 980],
    ],
    radius: 6,
    reflection: 0.16,
    brightness: 0.98,
    glow: 0.6,
  },
  "photo-story-a.png": {
    quad: [
      [312, 782],
      [462, 782],
      [466, 1072],
      [316, 1072],
    ],
    radius: 10,
    reflection: 0.2,
    brightness: 1.02,
    glow: 0.7,
  },
  "photo-story-b.png": {
    quad: [
      [339, 886],
      [449, 886],
      [449, 1099],
      [339, 1099],
    ],
    radius: 8,
    reflection: 0.18,
    brightness: 1.0,
    glow: 0.55,
  },
  "photo-laptop.png": {
    quad: [
      [551, 226],
      [969, 226],
      [942, 486],
      [530, 486],
    ],
    radius: 6,
    reflection: 0.1,
    brightness: 0.96,
    glow: 0.35,
  },
};
