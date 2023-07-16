import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  buttonText: string;
  isButtonDisabled?: boolean;
  buttonOnPress: () => void;
  buttonBackgroundColor: string;
  buttonIsLoading?: boolean;
  transcriptionText: string;
}

export const TranscriptionSection = (props: Props) => {
  return (
    <View style={{ alignSelf: "flex-start", marginBottom: 50 }}>
      <TouchableOpacity
        style={[
          styles.buttonContainer,
          {
            backgroundColor: props.buttonBackgroundColor,
            opacity: props.isButtonDisabled ? 0.5 : 1,
          },
        ]}
        onPress={props.buttonOnPress}
        disabled={props.isButtonDisabled}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Text style={styles.buttonText}>{props.buttonText}</Text>
          {props.buttonIsLoading && <ActivityIndicator color="white" />}
        </View>
      </TouchableOpacity>
      <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "bold" }}>
        Text:{" "}
        <Text style={{ fontSize: 15, fontWeight: "normal" }}>
          {props.transcriptionText}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    backgroundColor: "#a29bfe",
    padding: 12,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
});
