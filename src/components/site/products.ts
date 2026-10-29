import doorbell from "@/assets/product-doorbell.jpg";
import lock from "@/assets/product-lock.jpg";
import camera from "@/assets/product-camera.jpg";
import sensor from "@/assets/product-sensor.jpg";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: "Best Seller" | "New" | "Sale";
  image: string;
};

export const PRODUCTS: Product[] = [
  { id: "sh-cam-pro", name: "SentryHaus Cam Pro 4K", category: "Smart Cameras", price: 249, originalPrice: 299, rating: 4.9, reviews: 2841, badge: "Best Seller", image: camera },
  { id: "sh-doorbell-2", name: "Doorbell Cam 2 with HDR", category: "Doorbell Cameras", price: 199, rating: 4.8, reviews: 1742, badge: "New", image: doorbell },
  { id: "sh-lock-touch", name: "Smart Lock Touch", category: "Smart Locks", price: 329, originalPrice: 379, rating: 4.7, reviews: 912, badge: "Sale", image: lock },
  { id: "sh-sensor-mini", name: "Motion Sensor Mini", category: "Motion Sensors", price: 59, rating: 4.8, reviews: 1204, image: sensor },
];