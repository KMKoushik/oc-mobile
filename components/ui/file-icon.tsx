import { IconSymbol, type IconSymbolName } from "./icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { primary, dark, colors } from "@/constants/theme";

interface FileIconProps {
  filename: string;
  size?: number;
}

// Map file extensions to SF Symbol icons and colors
function getFileIconInfo(filename: string): {
  icon: IconSymbolName;
  color: string;
  colorDark: string;
} {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const name = filename.toLowerCase();

  // Special filenames
  if (name === "package.json" || name === "package-lock.json") {
    return {
      icon: "shippingbox",
      color: colors.red[500],
      colorDark: colors.red[400],
    };
  }
  if (name === "tsconfig.json" || name.startsWith("tsconfig.")) {
    return { icon: "gearshape", color: primary[500], colorDark: primary[400] };
  }
  if (name === ".gitignore" || name === ".git") {
    return {
      icon: "arrow.triangle.branch",
      color: colors.amber[600],
      colorDark: colors.amber[400],
    };
  }
  if (name === "dockerfile" || name.endsWith(".dockerfile")) {
    return {
      icon: "shippingbox",
      color: primary[500],
      colorDark: primary[400],
    };
  }
  if (name === ".env" || name.startsWith(".env.")) {
    return {
      icon: "lock",
      color: colors.amber[600],
      colorDark: colors.amber[400],
    };
  }

  // Extensions
  switch (ext) {
    case "ts":
    case "tsx":
      return { icon: "doc.text", color: primary[500], colorDark: primary[400] };
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return {
        icon: "doc.text",
        color: colors.amber[500],
        colorDark: colors.amber[400],
      };
    case "json":
      return {
        icon: "curlybraces",
        color: colors.amber[600],
        colorDark: colors.amber[400],
      };
    case "md":
    case "mdx":
      return { icon: "doc.richtext", color: dark[500], colorDark: dark[400] };
    case "css":
    case "scss":
    case "sass":
    case "less":
      return {
        icon: "paintbrush",
        color: primary[500],
        colorDark: primary[400],
      };
    case "html":
    case "htm":
      return {
        icon: "chevron.left.forwardslash.chevron.right",
        color: colors.amber[600],
        colorDark: colors.amber[400],
      };
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return {
        icon: "photo",
        color: colors.green[500],
        colorDark: colors.green[400],
      };
    case "yaml":
    case "yml":
      return {
        icon: "doc.text",
        color: colors.red[500],
        colorDark: colors.red[400],
      };
    case "sh":
    case "bash":
    case "zsh":
      return {
        icon: "terminal",
        color: colors.green[600],
        colorDark: colors.green[400],
      };
    case "py":
      return { icon: "doc.text", color: primary[500], colorDark: primary[400] };
    case "go":
      return { icon: "doc.text", color: primary[500], colorDark: primary[400] };
    case "rs":
      return {
        icon: "doc.text",
        color: colors.amber[600],
        colorDark: colors.amber[400],
      };
    case "sql":
      return { icon: "cylinder", color: primary[500], colorDark: primary[400] };
    default:
      return { icon: "doc", color: dark[500], colorDark: dark[400] };
  }
}

export function FileIcon({ filename, size = 16 }: FileIconProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { icon, color, colorDark } = getFileIconInfo(filename);

  return (
    <IconSymbol name={icon} size={size} color={isDark ? colorDark : color} />
  );
}
