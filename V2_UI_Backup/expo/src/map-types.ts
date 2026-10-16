import type { StyleProp, ViewStyle } from "react-native";

export type LatLng = { lat: number; lng: number };

export type MapPinData = { id: string; lat: number; lng: number; color: string; title: string; subtitle?: string };

export type MapCanvasProps = {
  pins?: MapPinData[];
  /** A draggable pin the user is placing (report screen). */
  pick?: LatLng | null;
  onPick?: (p: LatLng) => void;
  onPinPress?: (id: string) => void;
  /** Where the map opens. Defaults to Nassau. */
  center?: LatLng;
  /** Starting zoom as a latitude span in degrees; smaller is closer. */
  delta?: number;
  /** Change this object to fly the camera to a spot. */
  focus?: (LatLng & { nonce: number }) | null;
  style?: StyleProp<ViewStyle>;
};
