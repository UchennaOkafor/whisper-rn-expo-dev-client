import { StyleSheet, Text } from "react-native";

interface Props {
  value: number;
  text: string;
}

export const DownloadProgressText = (props: Props) => {
  return (
    <Text style={styles.text}>
      {props.text}
      <Text style={styles.textValue}>{` ${props.value.toFixed(1)}%`}</Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 100,
    alignSelf: "center",
  },
  textValue: {
    color: "green",
    fontWeight: "500",
  },
});
