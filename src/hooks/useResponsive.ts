
import { useWindowDimensions } from "react-native";

export default function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmallDevice = width < 375;
  const isLargeDevice = width >= 430;
  const isShortDevice = height < 750;

  const scale = Math.min(width / 390, 1.15);

  return {
    width,
    height,

    isSmallDevice,
    isLargeDevice,
    isShortDevice,

    scale,

    horizontalPadding: isSmallDevice ? 16 : 24,

    logoWidth: Math.min(width * 0.78, 310),

    logoHeight: Math.min(width * 0.78, 310) / 1.35,

    footerHeight: Math.min(
      height * 0.19,
      width * 0.42
    ),

    buttonHeight: isSmallDevice ? 52 : 58,

    sectionSpacing: isShortDevice ? 16 : 24,
  };
}
