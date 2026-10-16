import Image from "next/image";
const sizes = {
  back: [16, 16],
  "verified-partner": [14, 14],
  building: [16, 16],
  "sparkles-purple": [20, 20],
  indicator: [16, 16],
  "requirement-check": [16, 16],
  "recording-info": [44, 44],
  "video-white": [22, 14],
  award: [28, 28],
  "public-globe": [24, 24],
  "copy-white": [22, 22],
  "download-blue": [20, 20],
  "edit-blue": [16, 16],
  "key-blue": [16, 16],
  "draft-file": [24, 24],
  "save-white": [20, 20],
} as const;
export function DesignIcon({ name }: { name: keyof typeof sizes }) {
  const [width, height] = sizes[name];
  return (
    <Image
      src={`/design/${name}.svg`}
      alt=""
      width={width}
      height={height}
      className="shrink-0"
    />
  );
}
