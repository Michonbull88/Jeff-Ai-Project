export function watchAudio(
  context: AudioContext,
  stream: MediaStream,
  onLevel: (level: number) => void,
) {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let frame = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
    frame = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(frame);
    source.disconnect();
    analyser.disconnect();
    onLevel(0);
  };
}
