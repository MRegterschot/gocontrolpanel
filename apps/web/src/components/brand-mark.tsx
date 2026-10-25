import Image from "next/image";

/** Decorative mark paired with nearby text; use alt="TMControlPanel" when alone. */
export function BrandMark({
  className,
  alt = "",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src="/logo.svg"
      width={32}
      height={32}
      alt={alt}
      className={className}
    />
  );
}
