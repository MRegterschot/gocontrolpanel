type IconTmxProps = {
  size?: number;
  className?: string;
};

export default function IconTmx({ size = 24, className = "" }: IconTmxProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="40 40 140 140"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline
        className="fill-current"
        points="100.27 117.56 100.27 111.25 100.27 104.94 52.77 57.22 52.77 80.24 83.4 111.25 52.77 142.24 52.77 165.28 100.27 117.56"
      />
      <polyline
        className="fill-current"
        points="104.81 100.39 111.13 100.39 117.44 100.39 165.17 52.89 142.13 52.89 111.13 83.53 80.13 52.89 57.1 52.89 104.81 100.39"
      />
      <polyline
        className="fill-current"
        points="121.98 104.94 121.98 111.25 121.98 117.56 169.48 165.29 169.48 142.26 138.85 111.25 169.48 80.26 169.48 57.23 121.98 104.94"
      />
      <polyline
        className="fill-current"
        points="117.44 122.11 111.13 122.11 104.8 122.11 57.08 169.61 80.11 169.61 111.13 138.97 142.12 169.61 165.15 169.61 117.44 122.11"
      />
    </svg>
  );
}
