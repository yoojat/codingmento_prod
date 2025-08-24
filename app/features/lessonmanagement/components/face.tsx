export default function Face({
  myFaceRef,
  width = 400,
  height = 400,
}: {
  myFaceRef?: React.RefObject<HTMLVideoElement | null>;
  width?: number;
  height?: number;
}) {
  return (
    <div>
      <video ref={myFaceRef} autoPlay playsInline width={width}></video>
    </div>
  );
}
