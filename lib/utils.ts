import { createCn } from "cn/config";

// Teach shadcn's class merger that these text-* tokens set typography, not color.
// Otherwise `text-s7 text-primary-70` silently drops text-s7.
const typographySizes = [
  ...Array.from({ length: 9 }, (_, i) => `h${i + 1}`),
  ...["s", "sh", "b"].flatMap((prefix) =>
    Array.from({ length: 10 }, (_, i) => `${prefix}${i + 1}`),
  ),
];

export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: typographySizes }] } },
});
