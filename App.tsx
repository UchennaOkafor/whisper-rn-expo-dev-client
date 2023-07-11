import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WhisperContext, initWhisper } from "whisper.rn";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { useState } from 'react';

export default function App() {
  const [downloadProgress, setDownloadProgress] = useState(0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>whisper.rn expo dev client</Text>
      <TouchableOpacity style={styles.buttonContainer} onPress={loadModelFromAssets}>
        <Text style={styles.buttonText}>Initialize Model from Assets</Text>
      </TouchableOpacity>

      <Text style={styles.progressText}>
        Remote Download Progress:
        <Text style={styles.progressValue}>
          {` ${downloadProgress.toFixed(1)}%`}
        </Text>
      </Text>
      <TouchableOpacity style={styles.buttonContainer} onPress={loadModelFromUri}>
        <Text style={styles.buttonText}>Download Model from URL</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  async function loadModelFromAssets() {
    const whisperContext = await initWhisper({
      filePath: "ggml-tiny.bin",
      isBundleAsset: true,
    });

    await startTranscribing(whisperContext);
  }

  async function loadModelFromUri() {
    const downloadProgressCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite;

      setDownloadProgress((progress * 100));
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      FileSystem.documentDirectory + "ggml-tiny.bin",
      {},
      downloadProgressCallback
    );

    let filePath: string | undefined = '';

    try {
      const downloadResult = await downloadResumable.downloadAsync();
      filePath = downloadResult?.uri
      console.log("Finished downloading to ", downloadResult?.uri);
    } catch (e) {
      console.error(e);
    }

    const whisperContext = await initWhisper({
      filePath: filePath!,
      isBundleAsset: false,
    });

    await startTranscribing(whisperContext);
  }

  async function startTranscribing(whisperContext: WhisperContext) {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const options = { language: "en" };
    const { stop, subscribe } = await whisperContext.transcribeRealtime(
      options
    );

    subscribe((evt) => {
      const { isCapturing, data, processTime, recordingTime } = evt;
      console.log(
        `Realtime transcribing: ${isCapturing ? "ON" : "OFF"}\n` +
          // The inference text result from audio record:
          `Result: ${data?.result}\n\n` +
          `Process time: ${processTime}ms\n` +
          `Recording time: ${recordingTime}ms`
      );
      if (!isCapturing) console.log("Finished realtime transcribing");
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginVertical: 50,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 100,
  },
  progressValue: {
    color: "green",
    fontWeight: "500",
  },
  buttonContainer: {
    backgroundColor: "cornflowerblue",
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500'
  }
});
