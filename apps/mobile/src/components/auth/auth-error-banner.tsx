import { Text, View } from "react-native";

// Pinned light-on-dark: auth screens always render over the dark login video.
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <View
      className="mb-5 rounded-xl border px-4 py-3"
      style={{
        borderColor: "rgba(255, 157, 150, 0.5)",
        backgroundColor: "rgba(255, 122, 136, 0.14)",
      }}
    >
      <Text className="text-sm leading-6" style={{ color: "#FF9D96" }}>
        {message}
      </Text>
    </View>
  );
}
