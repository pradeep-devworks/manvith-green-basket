
import {
    Image,
    StyleSheet,
    View,
} from "react-native";

export default function BrandLogo() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/brand-logo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Manvith Green Basket"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 290,
    height: 235,
  },
});
