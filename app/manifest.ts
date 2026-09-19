import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JatriLive — Dhaka Bus Tracker",
    short_name: "JatriLive",
    description: "Community-powered live bus locations, ETAs, and stop alerts for Dhaka.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffefa",
    theme_color: "#173f35",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
