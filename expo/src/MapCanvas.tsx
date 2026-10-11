import { useEffect, useMemo, useRef } from "react";
import { Linking, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { BAHAMAS_CENTER } from "./geo";
import type { MapCanvasProps } from "./map-types";
import { color } from "./theme";

/**
 * The map for iPhone and Android. It is a Leaflet map shown inside a WebView, drawn from free
 * OpenStreetMap-family tiles, so it needs NO Google key and no billing account.
 * Aerial imagery (Esri) with street names (CARTO) by default; a button switches to a street map.
 *
 * Free public tile servers are fine for testing and small launches. Before a big public launch,
 * switch the tile addresses below to a provider you have an agreement with (MapTiler, Stadia, Mapbox...).
 */
const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS = "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";
const STREETS = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** Phone-width latitude span in degrees -> web-map zoom level. */
const zoomFor = (delta: number) => Math.max(3, Math.min(19, Math.round(Math.log2(540 / Math.max(delta, 0.0005)))));

const safe = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

function buildHtml(initial: { lat: number; lng: number; zoom: number; pins: unknown; pick: unknown; pickable: boolean }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;margin:0;background:#0b2230}
.leaflet-container{font-family:-apple-system,Roboto,sans-serif}
#mode{position:absolute;z-index:1000;top:10px;right:10px;background:rgba(3,18,27,.88);color:#e9f6f4;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:7px 12px;font:700 12px sans-serif}
#credit{position:absolute;z-index:1000;left:6px;bottom:4px;color:#fff;font:10px sans-serif;text-shadow:0 0 3px #000}
#msg{position:absolute;z-index:1000;left:10px;right:10px;top:50%;text-align:center;color:#e9f6f4;font:600 13px sans-serif;display:none}
.pin{width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2ee6d0;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)}
</style></head><body>
<div id="map"></div><button id="mode" type="button">Street map</button><div id="credit"></div>
<div id="msg">The map needs an internet connection.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function send(o){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }catch(e){} }
  if(!window.L){ document.getElementById('msg').style.display='block'; return; }
  var init=${safe(initial)};
  var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([init.lat,init.lng],init.zoom);
  var credit=document.getElementById('credit');
  var layers=[], aerial=true;
  function setBase(a){
    aerial=a; layers.forEach(function(l){map.removeLayer(l)}); layers=[];
    if(a){
      layers.push(L.tileLayer(${safe(IMAGERY)},{maxZoom:19,maxNativeZoom:18}).addTo(map));
      layers.push(L.tileLayer(${safe(LABELS)},{maxZoom:19,subdomains:'abcd'}).addTo(map));
      credit.textContent='Imagery Esri, Maxar, Earthstar Geographics. Labels CARTO, OpenStreetMap contributors';
    } else {
      layers.push(L.tileLayer(${safe(STREETS)},{maxZoom:19,subdomains:'abcd'}).addTo(map));
      credit.textContent='CARTO, OpenStreetMap contributors';
    }
    document.getElementById('mode').textContent=a?'Street map':'Aerial';
  }
  setBase(true);
  document.getElementById('mode').addEventListener('click',function(){ setBase(!aerial); });

  var pinLayer=L.layerGroup().addTo(map), pickMarker=null, pickable=init.pickable;
  window.setPins=function(pins){
    pinLayer.clearLayers();
    (pins||[]).forEach(function(p){
      var m=L.circleMarker([p.lat,p.lng],{radius:9,color:'#ffffff',weight:2,fillColor:p.color,fillOpacity:1}).addTo(pinLayer);
      var tip=document.createElement('div'); tip.textContent=p.title||''; m.bindTooltip(tip,{direction:'top'});
      m.on('click',function(e){ L.DomEvent.stopPropagation(e); send({type:'pin',id:p.id}); });
    });
  };
  function pickIcon(){ return L.divIcon({className:'',html:'<div class="pin"></div>',iconSize:[26,26],iconAnchor:[4,26]}); }
  window.setPick=function(p){
    if(!p){ if(pickMarker){ map.removeLayer(pickMarker); pickMarker=null; } return; }
    if(!pickMarker){
      pickMarker=L.marker([p.lat,p.lng],{draggable:true,icon:pickIcon()}).addTo(map);
      pickMarker.on('dragend',function(){ var c=pickMarker.getLatLng(); send({type:'pick',lat:c.lat,lng:c.lng}); });
    } else { pickMarker.setLatLng([p.lat,p.lng]); }
  };
  window.flyTo=function(lat,lng,zoom){ map.flyTo([lat,lng],zoom,{duration:.6}); };
  map.on('click',function(e){ if(pickable){ send({type:'pick',lat:e.latlng.lat,lng:e.latlng.lng}); } });
  window.setPickable=function(v){ pickable=v; };
  window.setPins(${safe(initial.pins)}); window.setPick(${safe(initial.pick)});
  var tilesFailed=0; map.eachLayer(function(l){ if(l.on){ l.on('tileerror',function(){ tilesFailed++; if(tilesFailed>6){ document.getElementById('msg').style.display='block'; } }); } });
  send({type:'ready'});
})();
</script></body></html>`;
}

export default function MapCanvas({ pins = [], pick, onPick, onPinPress, center, delta = 0.12, focus, style }: MapCanvasProps) {
  const ref = useRef<WebView>(null);
  const start = center ?? BAHAMAS_CENTER;
  const pickable = Boolean(onPick);

  // Built once; later changes are pushed in so the map keeps its zoom and position.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildHtml({ lat: start.lat, lng: start.lng, zoom: zoomFor(delta), pins, pick: pick ?? null, pickable }), []);
  const run = (js: string) => ref.current?.injectJavaScript(`try{${js}}catch(e){};true;`);

  useEffect(() => run(`window.setPins&&window.setPins(${safe(pins)})`), [pins]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => run(`window.setPick&&window.setPick(${safe(pick ?? null)})`), [pick?.lat, pick?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => run(`window.setPickable&&window.setPickable(${pickable})`), [pickable]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus) run(`window.flyTo&&window.flyTo(${focus.lat},${focus.lng},17)`);
  }, [focus?.nonce, focus?.lat, focus?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function onMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { type: string; id?: string; lat?: number; lng?: number };
      if (m.type === "pin" && m.id) onPinPress?.(m.id);
      if (m.type === "pick" && typeof m.lat === "number" && typeof m.lng === "number") onPick?.({ lat: m.lat, lng: m.lng });
    } catch {
      /* ignore malformed messages */
    }
  }

  return (
    <View style={[{ overflow: "hidden", backgroundColor: color.panel2 }, style]}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://localhost" }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        // The map page never navigates; anything that tries to is opened in the phone's browser instead.
        onShouldStartLoadWithRequest={(req) => {
          if (req.url === "about:blank" || req.url.startsWith("https://localhost") || req.url.startsWith("data:")) return true;
          if (req.isTopFrame !== false) void Linking.openURL(req.url).catch(() => undefined);
          return false;
        }}
        style={{ flex: 1, backgroundColor: color.panel2 }}
      />
    </View>
  );
}
