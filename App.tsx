import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  TranscribeOptions,
  TranscribeRealtimeOptions,
  WhisperContext,
  initWhisper,
} from "whisper.rn";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { AndroidOutputFormat, IOSAudioQuality } from "expo-av/build/Audio";
import { DownloadProgressText } from "./components/DownloadProgressText";
import { TranscriptionSection } from "./components/TranscriptionSection";

const RECORDING_OPTIONS_PRESET_LOW_QUALITY: any = {
  isMeteringEnabled: true,
  android: {
    extension: ".mp4",
    outputFormat: AndroidOutputFormat.MPEG_4,
    audioEncoder: AndroidOutputFormat.AMR_NB,
    sampleRate: 16000, // Set to 16000 for 16 kHz sample rate
    numberOfChannels: 1, // Set to 1 for mono channel
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    audioQuality: IOSAudioQuality.LOW,
    sampleRate: 16000, // Set to 16000 for 16 kHz sample rate
    numberOfChannels: 1, // Set to 1 for mono channel
    linearPCMBitDepth: 16, // Set to 16 for 16-bit audio
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export default function App() {
  const whisper = useRef<WhisperContext>();
  const [isModelInitialized, setIsModelInitialized] = useState(false);
  const [modelDownloadProgress, setModelDownloadProgress] = useState(0);

  //Transcribing real time text
  const [realtimeText, setRealtimeText] = useState("");
  const [isRealtimeTranscribing, setIsRealtimeTranscribing] = useState(false);
  const realTimeStopCallback = useRef<() => void>();

  //Trancribing from a file
  const [fileText, setFileText] = useState("");
  const [isTranscribingFile, setIsTranscribingFile] = useState(false);

  //Recording an audio file using the mic, saving it to a file then transcribing the file.
  const recording = useRef<Audio.Recording>();
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingAudioFile, setIsTranscribingAudioFile] = useState(false);
  const [audioText, setAudioText] = useState("");

  useEffect(() => {
    const init = async () => {
      if (!isModelInitialized) {
        await loadModelFromAssets();
        //await loadModelFromUri(); //UNCOMMENT THIS TO LOAD FROM URI
        setIsModelInitialized(true);
      }
    };
    init();
  }, []);

  if (!isModelInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Initializing Model...</Text>
        <ActivityIndicator color="black" />

        {modelDownloadProgress > 0 && (
          <DownloadProgressText
            text="Remote Download Progress:"
            value={modelDownloadProgress}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>whisper.rn expo-dev-client</Text>

        <TranscriptionSection
          buttonText={`${
            !isRealtimeTranscribing ? "Start" : "Stop"
          } Realtime Transcribe`}
          buttonOnPress={() => {
            if (!isRealtimeTranscribing) {
              startRealtimeTranscribe();
            } else {
              stopRealtimeTranscribe();
            }
          }}
          buttonBackgroundColor={
            !isRealtimeTranscribing ? "#a29bfe" : "#ff7675"
          }
          transcriptionText={realtimeText}
        />

        <TranscriptionSection
          buttonText={isTranscribingFile ? "Transcribing" : "Transcribe File"}
          buttonOnPress={async () => {
            //const audio = require("./assets/audio/input.mp3"); // PICK THIS
            const audio = require("./assets/audio/micro-machines.wav"); //OR THIS

            setIsTranscribingFile(true);
            setFileText("");
            const text = await transcribeFile(audio);
            setIsTranscribingFile(false);
            setFileText(text);
          }}
          isButtonDisabled={isTranscribingFile}
          buttonBackgroundColor={"#a29bfe"}
          buttonIsLoading={isTranscribingFile}
          transcriptionText={fileText}
        />

        <TranscriptionSection
          buttonText={getAudioTrancriptionButtonText()}
          buttonOnPress={async () => {
            if (!isRecordingAudio) {
              await startRecordingAudio();
            } else {
              setIsTranscribingAudioFile(true);
              setAudioText("");
              const uri = await stopRecordingAudio();
              const result = await transcribeFile(uri);
              setIsTranscribingAudioFile(false);
              setAudioText(result);
            }
          }}
          isButtonDisabled={isTranscribingAudioFile}
          buttonBackgroundColor={!isRecordingAudio ? "#a29bfe" : "#ff7675"}
          transcriptionText={audioText}
          buttonIsLoading={isTranscribingAudioFile}
        />
      </View>
    </SafeAreaView>
  );

  function getAudioTrancriptionButtonText() {
    if (isTranscribingAudioFile) {
      return "Please wait";
    }

    if (isRecordingAudio) {
      return "Stop recording";
    } else {
      return "Start voice recording";
    }
  }

  function getCoreModelAsset() {
    if (Platform.OS === "ios") {
      return {
        filename: "ggml-tiny-encoder.mlmodelc",
        assets: [
          require("./assets/whisper/ggml-tiny-encoder.mlmodelc/weights/weight.bin"),
          require("./assets/whisper/ggml-tiny-encoder.mlmodelc/model.mil"),
          require("./assets/whisper/ggml-tiny-encoder.mlmodelc/coremldata.bin"),
        ],
      };
    }

    return undefined;
  }

  async function loadModelFromAssets() {
    whisper.current = await initWhisper({
      filePath: require("./assets/whisper/ggml-tiny.bin"),
      // coreMLModelAsset: getCoreModelAsset(),
    });
  }

  async function loadModelFromUri() {
    const downloadProgressCallback = (
      downloadProgress: FileSystem.DownloadProgressData
    ) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite;

      setModelDownloadProgress(progress * 100);
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
      FileSystem.documentDirectory + "ggml-tiny.bin",
      {},
      downloadProgressCallback
    );

    let filePath: string | undefined = "";

    try {
      const downloadResult = await downloadResumable.downloadAsync();
      filePath = downloadResult?.uri;
      console.log("Finished downloading to ", downloadResult?.uri);
    } catch (e) {
      console.error(e);
    }

    whisper.current = await initWhisper({
      filePath: filePath!,
      isBundleAsset: false,
      coreMLModelAsset: getCoreModelAsset(),
    });
  }

  async function startRealtimeTranscribe() {
    await Audio.requestPermissionsAsync();

    const realtimeOptions: TranscribeRealtimeOptions = {
      language: "en",
      realtimeAudioSec: 60,
      realtimeAudioSliceSec: 20,
      maxThreads: 6,
    };

    const { stop, subscribe } = await whisper.current!.transcribeRealtime(
      realtimeOptions
    );

    realTimeStopCallback.current = stop;
    setIsRealtimeTranscribing(true);

    subscribe((evt) => {
      const { isCapturing, data, processTime, recordingTime } = evt;

      console.log(
        `
          Realtime transcribing: ${isCapturing ? "ON" : "OFF"}
          Result: ${data?.result}
          Process time: ${processTime}ms
          Recording time: ${recordingTime}ms
        `
      );

      setRealtimeText(data?.result ?? "");
      if (!isCapturing) console.log("Finished realtime transcribing");
    });
  }

  async function stopRealtimeTranscribe() {
    realTimeStopCallback.current?.();
    setIsRealtimeTranscribing(false);
  }

  async function transcribeFile(audio: any): Promise<string> {
    const transcribeOptions: TranscribeOptions = {
      language: "en",
      maxThreads: 6,
    };

    const { stop, promise } = whisper.current!.transcribe(
      audio,
      transcribeOptions
    );

    console.log(`File Transcribe Started`);
    const { result } = await promise;
    console.log(`File Transcribe Result: ${result}`);
    return result;
  }

  async function startRecordingAudio() {
    try {
      setIsRecordingAudio(true);
      console.log("Requesting permissions..");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording: localRecording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS_PRESET_LOW_QUALITY
      );
      recording.current = localRecording;
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      setIsRecordingAudio(false);
    }
  }

  async function stopRecordingAudio() {
    console.log("Stopping recording..");
    await recording.current?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.current?.getURI();
    console.log("Recording stopped and stored at", uri);

    recording.current = undefined;
    setIsRecordingAudio(false);
    return uri;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 30,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
