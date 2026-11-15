"use client";

import { useEffect } from "react";

import { canteenData } from "../data-client";

export function PreloadCanteenData() {
  useEffect(() => {
    canteenData().catch(() => {});
  }, []);
  return null;
}
