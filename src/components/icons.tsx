interface IconProps {
  size?: number;
}

function svgProps(size = 22) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export const HomeIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

export const PeopleIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20c.8-3.2 3.3-5 6.2-5s5.4 1.8 6.2 5" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.8" />
    <path d="M17.8 15.3c1.8.7 3 2.2 3.4 4.7" />
  </svg>
);

export const BuildingIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="4" y="3" width="12" height="18" rx="1" />
    <path d="M16 9h4v12h-4" />
    <path d="M8 7h1.5M8 11h1.5M8 15h1.5M12 7h1.5M12 11h1.5M12 15h1.5" />
    <path d="M9.5 21v-3h3v3" />
  </svg>
);

export const WrenchIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6a2 2 0 1 0 2.8 2.8l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14 11.8l-2.4-2.4 3.1-3.1z" />
  </svg>
);

export const ScanIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M4 12h16" />
  </svg>
);

export const PhoneIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M5 4h4l1.5 4.5L8 10a12 12 0 0 0 6 6l1.5-2.5L20 15v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

export const PlusIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronRight = ({ size }: IconProps) => (
  <svg {...svgProps(size ?? 18)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronLeft = ({ size }: IconProps) => (
  <svg {...svgProps(size ?? 18)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const CheckIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const MicIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const SparkleIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z" />
  </svg>
);

export const CameraIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="14" r="3.5" />
  </svg>
);

export const TrashIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size ?? 18)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

export const StarIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size ?? 14)} fill="currentColor" stroke="none">
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);
