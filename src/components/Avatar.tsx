import { initials } from "../utils/format";

interface AvatarProps {
  first: string;
  last: string;
  photo?: string;
  large?: boolean;
}

export default function Avatar({ first, last, photo, large }: AvatarProps) {
  return (
    <div className={`avatar${large ? " lg" : ""}`}>
      {photo ? <img src={photo} alt={`${first} ${last}`} /> : initials(first, last)}
    </div>
  );
}
