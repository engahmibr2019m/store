/** خلفية احتياطية بألوان البراند تظهر خلف الفيديو لحد ما الفيديو يتحمّل، وتتحرك مع السكرول */
export default function Backdrop({ progress }: { progress: number }) {
  const a = 160 + progress * 140;
  const background = [
    `radial-gradient(60% 50% at ${30 + progress * 40}% ${30 + progress * 30}%, #9b5de5 0%, transparent 70%)`,
    `radial-gradient(50% 60% at ${75 - progress * 30}% 70%, #7b2cbf 0%, transparent 70%)`,
    `linear-gradient(${a}deg, #1a0633, #3c096c 60%, #0b0213)`,
  ].join(',');
  return <div className="fallback-bg" style={{ background }} />;
}
