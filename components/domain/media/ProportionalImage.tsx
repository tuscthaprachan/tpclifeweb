import Image from "next/image";

export function ProportionalImage({
  src,
  alt,
  width,
  height,
  priority,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const ratio = width && height ? `${width} / ${height}` : "16 / 9";
  return (
    <div className="relative w-full overflow-hidden rounded-panel bg-surface-sunk" style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill sizes="(min-width: 768px) 720px, 100vw" className="object-contain" priority={priority} />
    </div>
  );
}
