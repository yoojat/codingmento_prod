import { useCallback, useEffect, useState } from "react";

interface MediaStreamConstraints {
  audio: boolean;
  video: MediaTrackConstraints;
}

interface UseMediaStreamReturn {
  stream: MediaStream | null;
  cameras: MediaDeviceInfo[];
  error: Error | null;
  isLoading: boolean;
  switchCamera: (deviceId: string) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  cleanup: () => void;
}

export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const getCameras = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setCameras(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error("Failed to get camera devices:", err);
      setError(err as Error);
      return [];
    }
  }, []);

  const getMediaStream = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
      try {
        setError(null);
        setIsLoading(true);

        const constraints: MediaStreamConstraints = {
          audio: true,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "user" },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        // 이전 스트림 정리
        cleanup();

        setStream(newStream);
        await getCameras();
        return newStream;
      } catch (err) {
        console.error("Failed to get media stream:", err);
        setError(err as Error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [cleanup, getCameras]
  );

  const switchCamera = useCallback(
    async (deviceId: string): Promise<void> => {
      await getMediaStream(deviceId);
    },
    [getMediaStream]
  );

  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [stream]);

  useEffect(() => {
    getMediaStream();

    return () => {
      cleanup();
    };
  }, []);

  return {
    stream,
    cameras,
    error,
    isLoading,
    switchCamera,
    toggleAudio,
    toggleVideo,
    cleanup,
  };
}
