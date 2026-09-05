import { characters } from '../data';

export default function RelicArt({ id }: { id: string }) {
  const hero = characters.find(c => c.id === id);
  if (hero && !['knight', 'rogue', 'mage'].includes(id)) return <svg width="84" height="96" viewBox="0 0 40 48" fill="none" shapeRendering="crispEdges" aria-hidden="true">
    {['slash', 'fists'].includes(hero.style) ? <><path d="M18 3h4v4h2v22h-8V7h2z" fill="#5c6260" /><path d="M19 4h2v24h-2z" fill={hero.color} /><path d="M10 29h20v3H10zM17 32h6v12h-6z" fill={hero.color} /><path d="M19 33h2v10h-2z" fill="#504331" />{id === 'warden' || id === 'berserker' ? <path d="M10 8h20v12H10z" fill={hero.color} /> : id === 'monk' ? <path d="M6 12h9v16H6zm19 0h9v16h-9z" fill={hero.color} /> : null}</> : hero.style === 'arrow' ? <><path d="M11 4h8v3h5v5h3v23h-3v5h-5v3h-8v-3h7v-4h5V11h-5V7h-7z" fill={hero.color} /><path d="M11 6h1v36h-1zM4 23h30v2H4zM30 20h4v8h-4z" fill="#d9c48e" /></> : <><path d="M18 19h4v27h-4z" fill="#8d7151" /><path d="M14 18h12v4H14zM16 34h8v3h-8z" fill={hero.color} /><path d="M17 3h6v3h5v4h3v7h-4v4H13v-4H9v-7h3V6h5z" fill={hero.color} /><path d="M18 8h4v9h-4zM15 11h10v3H15z" fill="#eee3ff" />{id === 'phantom' && <path d="M20 1h13v3h4v13h-3v6h-4V9h-3V5h-7z" fill="#caa6ff" />}</>}
  </svg>;
  return <svg width="84" height="96" viewBox="0 0 40 48" fill="none" shapeRendering="crispEdges" aria-hidden="true">
    {id === 'knight' && <>
      <path d="M18 2h4v3h2v27h-8V5h2z" fill="#384442" />
      <path d="M19 3h2v3h2v25h-6V6h2z" fill="#a5b3a5" />
      <path d="M19 6h2v24h-2z" fill="#e0e4c3" />
      <path d="M21 7h2v24h-2z" fill="#667a77" />
      <path d="M9 30h22v5h-3v-2H12v2H9z" fill="#6f542c" />
      <path d="M10 30h20v2H10zM17 32h6v4h-6z" fill="#d0ad64" />
      <path d="M18 36h4v7h-4z" fill="#755137" />
      <path d="M18 37h4v1h-4zm0 3h4v1h-4z" fill="#b5975a" />
      <path d="M17 43h6v3h-6z" fill="#b89853" />
      <path d="M18 43h3v1h-3z" fill="#e2c582" />
    </>}
    {id === 'rogue' && [0, 15].map((offset, index) => <g key={offset} transform={`translate(${offset}, ${index * 4})`}>
      <path d="M9 3h3v4h3v19h-3v4H8v-4H5V12h2V6h2z" fill="#49415b" />
      <path d="M9 6h2v4h2v15h-2v3H9v-3H7V12h2z" fill="#bdb4ca" />
      <path d="M9 9h2v18H9z" fill="#eee0ed" />
      <path d="M4 28h12v3H4z" fill="#847098" />
      <path d="M5 28h10v1H5z" fill="#c5a7d8" />
      <path d="M8 31h4v9H8z" fill="#4e3b63" />
      <path d="M8 33h4v1H8zm0 4h4v1H8zM7 40h6v3H7z" fill="#a58bb6" />
    </g>)}
    {id === 'mage' && <>
      <path d="M18 19h5v27h-5zM14 16h4v9h-4zm9-2h4v10h-4zM12 12h4v8h-4zm15-1h3v8h-3z" fill="#634530" />
      <path d="M19 21h2v24h-2zm-4-4h2v6h-2zm9-1h2v7h-2z" fill="#b0874c" />
      <path d="M17 25h7v3h-7zm0 10h7v3h-7z" fill="#bc8c4e" />
      <path d="M20 1h3v6h4v4h3v6h-3v4H16v-3h-4v-7h4V6h4z" fill="#9b411e" />
      <path d="M20 4h2v6h4v3h2v4h-4v3h-7v-3h-3v-5h4V8h2z" fill="#e3862f" />
      <path d="M19 10h4v3h3v4h-4v2h-5v-5h2z" fill="#f8c65d" />
      <path d="M20 13h3v4h-3zM9 6h2v3H9zm20-5h2v2h-2z" fill="#ffe4a0" />
    </>}
    {id === 'emberheart' && <>
      <path d="M7 12h9v4h8v-4h9v4h4v13h-4v4h-4v4h-4v4H15v-4h-4v-4H7v-4H3V16h4z" fill="#573727" />
      <path d="M8 14h7v4h10v-4h7v4h3v10h-4v4h-4v4h-4v4h-6v-4h-4v-4H9v-4H5V18h3z" fill="#b34f2b" />
      <path d="M8 16h6v4h12v-4h5v4h2v7h-5v5h-5v5h-5v-5h-5v-5H7v-7h1z" fill="#e5873b" />
      <path d="M10 17h4v5h-4zm6 7h7v5h-7zm2 5h4v5h-4z" fill="#f3be65" />
      <path d="M18 25h4v3h-4zM19 4h2v5h-2zM5 7h2v3H5zm28 0h2v3h-2z" fill="#f9db91" />
    </>}
    {id === 'iron-sigil' && <>
      <path d="M19 3h3v5h-3zM5 10h30v20h-3v5h-4v4h-4v4h-8v-4h-4v-4H8v-5H5z" fill="#535c51" />
      <path d="M8 12h24v17h-3v5h-4v4h-4v3h-2v-3h-4v-4h-4v-5H8z" fill="#a0a48a" />
      <path d="M10 14h20v14h-3v5h-4v4h-6v-4h-4v-5h-3z" fill="#404c42" />
      <path d="M18 17h4v17h-4zM13 22h14v4H13z" fill="#c9b579" />
      <path d="M18 17h2v17h-2zM13 22h14v1H13z" fill="#e7d69e" />
      <path d="M8 13h2v2H8zm22 0h2v2h-2zM15 36h2v2h-2zm9 0h2v2h-2z" fill="#d1cfad" />
    </>}
    {id === 'lost-crown' && <>
      <path d="M2 15h4v4h4v4h5v-9h3V8h4v6h3v9h5v-4h4v-4h4v7h-2v15H4V22H2z" fill="#806036" />
      <path d="M5 19h2v4h4v3h5V16h3v-5h2v5h3v10h5v-3h4v-4h2v5h-2v9H7v-9H5z" fill="#caa45a" />
      <path d="M8 27h24v6H8zM5 35h30v5H5z" fill="#d8b86a" />
      <path d="M7 35h26v2H7zM19 14h2v9h-2zM7 23h2v7H7zm24 0h2v7h-2z" fill="#eee0a0" />
      <path d="M17 27h6v5h-6z" fill="#7c3c2b" /><path d="M18 27h4v3h-4z" fill="#c56f3d" />
      <path d="M10 36h2v2h-2zm18 0h2v2h-2z" fill="#846541" />
    </>}
  </svg>;
}